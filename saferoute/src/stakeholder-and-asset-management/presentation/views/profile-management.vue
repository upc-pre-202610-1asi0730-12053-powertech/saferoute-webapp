<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { StakeholderApi } from '../../infrastructure/stakeholder-api.js';

const { t } = useI18n();
const api = new StakeholderApi();

const profiles  = ref([]);
const loading   = ref(false);
const activeTab = ref('all');
const search    = ref('');
const showDialog = ref(false);
const isEdit    = ref(false);
const form      = ref({ firstName: '', lastName: '', phone: '', role: 'parent' });

const tabs = [
  { key: 'all',    label: 'Todos'       },
  { key: 'parent', label: 'Padres'      },
  { key: 'driver', label: 'Conductores' },
];

const filtered = computed(() => {
  let list = profiles.value;
  if (activeTab.value !== 'all') list = list.filter(p => p.role === activeTab.value);
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      (p.phone || '').includes(q)
    );
  }
  return list;
});

function roleLabel(role) {
  return role === 'driver' ? 'Conductor' : 'Padre/Madre';
}
function roleColor(role) {
  return role === 'driver'
    ? { bg: '#dbeafe', text: '#1d4ed8' }
    : { bg: '#fce7f3', text: '#be185d' };
}

function openCreate() {
  isEdit.value = false;
  form.value = { firstName: '', lastName: '', phone: '', role: 'parent' };
  showDialog.value = true;
}

function openEdit(profile) {
  isEdit.value = true;
  form.value = { ...profile };
  showDialog.value = true;
}

async function saveProfile() {
  if (isEdit.value) {
    await api.updateProfile(form.value);
    const idx = profiles.value.findIndex(p => p.id === form.value.id);
    if (idx !== -1) profiles.value[idx] = { ...form.value };
  } else {
    const res = await api.createProfile(form.value);
    profiles.value.push(res.data);
  }
  showDialog.value = false;
}

async function deleteProfile(id) {
  await api.deleteProfile(id);
  profiles.value = profiles.value.filter(p => p.id !== id);
}

async function loadProfiles() {
  loading.value = true;
  const res = await api.getProfiles();
  profiles.value = res.data || [];
  loading.value = false;
}

onMounted(loadProfiles);
</script>

<template>
  <div class="profile-mgmt">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('stakeholder-and-asset-management.management.title') }}</h1>
        <p class="page-sub">Gestión de padres, madres y conductores</p>
      </div>
      <pv-button :label="t('stakeholder-and-asset-management.management.new')" icon="pi pi-user-plus" @click="openCreate"/>
    </div>

    <!-- Tabs + search -->
    <div class="toolbar-row">
      <div class="tabs-group">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key">
          {{ tab.label }}
        </button>
      </div>
      <pv-input-text v-model="search" :placeholder="t('general.search')" class="search-input"/>
    </div>

    <!-- Table -->
    <div class="table-card">
      <pv-data-table
        :value="filtered"
        :loading="loading"
        striped-rows
        responsive-layout="scroll"
        class="p-datatable-sm">
        <pv-column field="firstName" header="Nombre">
          <template #body="{ data }">
            <div class="name-cell">
              <div class="avatar">{{ data.firstName?.[0] }}{{ data.lastName?.[0] }}</div>
              <span>{{ data.firstName }} {{ data.lastName }}</span>
            </div>
          </template>
        </pv-column>
        <pv-column field="phone" header="Teléfono"/>
        <pv-column field="role" header="Rol">
          <template #body="{ data }">
            <span class="role-badge" :style="{ background: roleColor(data.role).bg, color: roleColor(data.role).text }">
              {{ roleLabel(data.role) }}
            </span>
          </template>
        </pv-column>
        <pv-column header="Acciones" style="width:120px">
          <template #body="{ data }">
            <div class="actions-cell">
              <pv-button icon="pi pi-pencil" size="small" text @click="openEdit(data)"/>
              <pv-button icon="pi pi-trash"  size="small" text severity="danger" @click="deleteProfile(data.id)"/>
            </div>
          </template>
        </pv-column>
      </pv-data-table>
    </div>

    <!-- Dialog -->
    <pv-dialog v-model:visible="showDialog" :header="isEdit ? 'Editar Perfil' : 'Nuevo Perfil'" modal style="width:440px">
      <div class="dialog-form">
        <div class="field">
          <label>Nombre</label>
          <pv-input-text v-model="form.firstName" class="w-full" required/>
        </div>
        <div class="field">
          <label>Apellido</label>
          <pv-input-text v-model="form.lastName" class="w-full" required/>
        </div>
        <div class="field">
          <label>Teléfono</label>
          <pv-input-text v-model="form.phone" class="w-full"/>
        </div>
        <div class="field">
          <label>Rol</label>
          <pv-select v-model="form.role" :options="[{label:'Padre/Madre',value:'parent'},{label:'Conductor',value:'driver'}]" option-label="label" option-value="value" class="w-full"/>
        </div>
      </div>
      <template #footer>
        <pv-button label="Cancelar" text @click="showDialog = false"/>
        <pv-button label="Guardar" icon="pi pi-check" @click="saveProfile"/>
      </template>
    </pv-dialog>
  </div>
</template>

<style scoped>
.profile-mgmt { padding: 1.75rem; background: var(--bg); min-height: 100vh; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.page-title { font-size: 1.5rem; font-weight: 700; color: var(--dark); margin: 0 0 0.25rem; }
.page-sub   { font-size: 0.875rem; color: var(--muted); margin: 0; }

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 1rem;
}

.tabs-group { display: flex; gap: 0.4rem; }
.tab-btn {
  padding: 0.45rem 1rem;
  border: 2px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--muted);
  transition: all 0.15s;
}
.tab-btn:hover  { border-color: var(--amber); color: var(--dark); }
.tab-btn.active { border-color: var(--amber); background: #fffbf2; color: var(--dark); font-weight: 600; }

.search-input { max-width: 240px; }

.table-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }

.name-cell { display: flex; align-items: center; gap: 0.65rem; }
.avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--amber); color: var(--dark);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.72rem; font-weight: 700; flex-shrink: 0;
}

.role-badge { font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
.actions-cell { display: flex; gap: 0.25rem; }

.dialog-form { display: flex; flex-direction: column; gap: 0.85rem; padding: 0.5rem 0; }
.dialog-form .field { display: flex; flex-direction: column; gap: 0.3rem; }
.dialog-form label { font-size: 0.85rem; font-weight: 600; color: var(--dark); }
</style>
