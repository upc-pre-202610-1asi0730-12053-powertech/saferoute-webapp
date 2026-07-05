<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useIamStore } from '../../../identity-and-access-management/application/iam.store.js';
import { StakeholderApi } from '../../infrastructure/stakeholder-api.js';

const toast = useToast();
const iamStore = useIamStore();
const stakeholderApi = new StakeholderApi();

const loading = ref(false);
const saving = ref(false);
const groups = ref([]);
const children = ref([]);
const addChildByGroup = reactive({});

const form = ref({
  name: '',
  childIds: [],
});

const orgId = computed(() => iamStore.currentUser?.organizationId || null);

function normalizeIds(ids) {
  return (ids || []).map(id => String(id));
}

function normalizeGroup(group) {
  return {
    ...group,
    id: String(group.id),
    organizationId: group.organizationId,
    name: group.name || 'Grupo sin nombre',
    childIds: normalizeIds(group.childIds || group.childrenIds || []),
    isFinalized: Boolean(group.isFinalized ?? group.isFinalizedValue),
  };
}

function personName(person) {
  return person.fullName || [person.firstName, person.lastName].filter(Boolean).join(' ') || person.name || '';
}

function childLabel(child) {
  return personName(child) || `Alumno ${child.id}`;
}

function flattenChildren(parents) {
  return (parents || []).flatMap(parent =>
    (parent.children || []).map(child => ({
      ...child,
      id: String(child.id),
      parentId: parent.id,
      parentName: personName(parent),
      name: childLabel(child),
    }))
  ).sort((a, b) => a.name.localeCompare(b.name));
}

const normalizedGroups = computed(() =>
  groups.value.map(normalizeGroup).sort((a, b) => a.name.localeCompare(b.name))
);

const childById = computed(() => {
  const map = new Map();
  children.value.forEach(child => map.set(String(child.id), child));
  return map;
});

const totalGroupedChildren = computed(() => {
  const ids = new Set();
  normalizedGroups.value.forEach(group => group.childIds.forEach(id => ids.add(String(id))));
  return ids.size;
});

function groupChildren(group) {
  return group.childIds
    .map(id => childById.value.get(String(id)))
    .filter(Boolean);
}

function availableChildrenFor(group) {
  const assigned = new Set(group.childIds.map(String));
  return children.value
    .filter(child => !assigned.has(String(child.id)))
    .map(child => ({
      label: `${child.name}${child.parentName ? ` - ${child.parentName}` : ''}`,
      value: String(child.id),
    }));
}

async function loadData() {
  loading.value = true;
  try {
    const [groupsRes, parentsRes] = await Promise.all([
      stakeholderApi.getGroupsByOrganization(orgId.value),
      stakeholderApi.getParentsByOrganization(orgId.value),
    ]);
    groups.value = groupsRes.data || [];
    children.value = flattenChildren(parentsRes.data || []);
  } catch (error) {
    console.error('Student group data load failed:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los grupos de alumnos.', life: 4000 });
  } finally {
    loading.value = false;
  }
}

function toggleFormChild(childId) {
  const id = String(childId);
  const selected = new Set(form.value.childIds.map(String));
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  form.value.childIds = [...selected];
}

async function createGroup() {
  if (!form.value.name.trim()) {
    toast.add({ severity: 'error', summary: 'Nombre requerido', detail: 'Ingresa un nombre para el grupo.', life: 3000 });
    return;
  }
  if (!form.value.childIds.length) {
    toast.add({ severity: 'error', summary: 'Alumnos requeridos', detail: 'Selecciona al menos un alumno.', life: 3000 });
    return;
  }

  saving.value = true;
  try {
    await stakeholderApi.createStudentGroup({
      organizationId: orgId.value,
      name: form.value.name.trim(),
      childIds: form.value.childIds,
    });
    form.value = { name: '', childIds: [] };
    await loadData();
    toast.add({ severity: 'success', summary: 'Grupo creado', detail: 'El grupo de alumnos quedo listo para rutas.', life: 3000 });
  } catch (error) {
    console.error('Student group create failed:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el grupo.', life: 4000 });
  } finally {
    saving.value = false;
  }
}

async function addChild(group) {
  const childId = addChildByGroup[group.id];
  if (!childId) return;
  try {
    await stakeholderApi.addChildToGroup(group.id, childId);
    addChildByGroup[group.id] = null;
    await loadData();
    toast.add({ severity: 'success', summary: 'Alumno agregado', detail: group.name, life: 2500 });
  } catch (error) {
    console.error('Student group add child failed:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo agregar el alumno al grupo.', life: 4000 });
  }
}

async function removeChild(group, childId) {
  try {
    await stakeholderApi.removeChildFromGroup(group.id, childId);
    await loadData();
    toast.add({ severity: 'warn', summary: 'Alumno retirado', detail: group.name, life: 2500 });
  } catch (error) {
    console.error('Student group remove child failed:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo retirar el alumno del grupo.', life: 4000 });
  }
}

async function finalizeGroup(group) {
  try {
    await stakeholderApi.finalizeGroup(group.id);
    await loadData();
    toast.add({ severity: 'success', summary: 'Grupo finalizado', detail: group.name, life: 3000 });
  } catch (error) {
    console.error('Student group finalize failed:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo finalizar el grupo.', life: 4000 });
  }
}

onMounted(loadData);
</script>

<template>
  <div class="student-groups-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Grupos de estudiantes</h1>
        <p class="page-sub">Agrupa alumnos para asignarlos rapidamente a las rutas.</p>
      </div>
      <pv-button icon="pi pi-refresh" label="Actualizar" outlined :loading="loading" @click="loadData"/>
    </div>

    <section class="summary-strip">
      <div class="summary-item">
        <span class="summary-label">Grupos</span>
        <strong>{{ normalizedGroups.length }}</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">Alumnos disponibles</span>
        <strong>{{ children.length }}</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">Alumnos agrupados</span>
        <strong>{{ totalGroupedChildren }}</strong>
      </div>
    </section>

    <div class="groups-grid">
      <aside class="group-form-panel">
        <div class="panel-header">
          <h2>Nuevo grupo</h2>
        </div>

        <div class="field">
          <label>Nombre</label>
          <pv-input-text v-model="form.name" class="w-full" placeholder="Ej: Inicial - Ruta Norte"/>
        </div>

        <div class="students-picker">
          <div class="students-picker-head">
            <span>Alumnos</span>
            <strong>{{ form.childIds.length }}</strong>
          </div>

          <div v-if="children.length" class="student-list">
            <label
              v-for="child in children"
              :key="child.id"
              class="student-option"
              :class="{ selected: form.childIds.map(String).includes(String(child.id)) }">
              <input
                type="checkbox"
                :checked="form.childIds.map(String).includes(String(child.id))"
                @change="toggleFormChild(child.id)"/>
              <span>
                <strong>{{ child.name }}</strong>
                <small v-if="child.parentName">{{ child.parentName }}</small>
              </span>
            </label>
          </div>

          <div v-else class="empty-state">
            No hay alumnos registrados.
          </div>
        </div>

        <pv-button
          label="Crear grupo"
          icon="pi pi-plus"
          class="w-full"
          :loading="saving"
          :disabled="!children.length"
          @click="createGroup"/>
      </aside>

      <main class="groups-list-panel">
        <div v-if="loading" class="state-msg">
          <i class="pi pi-spin pi-spinner"/> Cargando grupos...
        </div>

        <div v-else-if="!normalizedGroups.length" class="state-msg">
          Aun no hay grupos de estudiantes.
        </div>

        <article v-for="group in normalizedGroups" :key="group.id" class="group-card">
          <header class="group-card-head">
            <div>
              <h2>{{ group.name }}</h2>
              <span>{{ group.childIds.length }} alumno{{ group.childIds.length === 1 ? '' : 's' }}</span>
            </div>
            <span class="status-pill" :class="{ finalized: group.isFinalized }">
              {{ group.isFinalized ? 'Finalizado' : 'Borrador' }}
            </span>
          </header>

          <div v-if="groupChildren(group).length" class="member-list">
            <span v-for="child in groupChildren(group)" :key="child.id" class="member-chip">
              {{ child.name }}
              <button
                v-if="!group.isFinalized"
                type="button"
                aria-label="Retirar alumno"
                @click="removeChild(group, child.id)">
                <i class="pi pi-times"/>
              </button>
            </span>
          </div>
          <div v-else class="empty-inline">Sin alumnos asignados.</div>

          <footer v-if="!group.isFinalized" class="group-actions">
            <pv-select
              v-model="addChildByGroup[group.id]"
              :options="availableChildrenFor(group)"
              option-label="label"
              option-value="value"
              placeholder="Agregar alumno"
              class="add-student-select"/>
            <pv-button icon="pi pi-user-plus" label="Agregar" outlined @click="addChild(group)"/>
            <pv-button icon="pi pi-lock" label="Finalizar" severity="secondary" @click="finalizeGroup(group)"/>
          </footer>
        </article>
      </main>
    </div>
  </div>
</template>

<style scoped>
.student-groups-page {
  min-height: 100vh;
  padding: 1.75rem;
  background: var(--bg);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.page-title {
  margin: 0 0 0.25rem;
  color: var(--dark);
  font-family: var(--heading);
  font-size: 1.55rem;
  font-weight: 800;
}

.page-sub {
  margin: 0;
  color: var(--muted);
  font-size: 0.875rem;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 0.75rem 0.9rem;
}

.summary-label {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.summary-item strong {
  color: var(--dark);
  font-size: 1.1rem;
}

.groups-grid {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.group-form-panel,
.group-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.group-form-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  position: sticky;
  top: 1rem;
}

.panel-header h2,
.group-card h2 {
  margin: 0;
  color: var(--dark);
  font-family: var(--heading);
  font-size: 1rem;
  font-weight: 800;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field label {
  color: var(--dark);
  font-size: 0.84rem;
  font-weight: 700;
}

.students-picker {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.students-picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  padding: 0.6rem 0.75rem;
  color: var(--dark);
  font-size: 0.82rem;
  font-weight: 800;
}

.students-picker-head strong {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--amber);
  color: var(--dark);
  font-size: 0.72rem;
}

.student-list {
  max-height: 320px;
  overflow-y: auto;
}

.student-option {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  border-bottom: 1px solid #f3f4f6;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
}

.student-option:last-child {
  border-bottom: none;
}

.student-option:hover,
.student-option.selected {
  background: #fffbf2;
}

.student-option input {
  margin-top: 0.15rem;
  accent-color: var(--amber);
}

.student-option span {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.student-option strong {
  color: var(--dark);
  font-size: 0.82rem;
}

.student-option small {
  color: var(--muted);
  font-size: 0.72rem;
}

.groups-list-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.group-card {
  padding: 1rem;
}

.group-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.group-card-head span {
  color: var(--muted);
  font-size: 0.76rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: #fffbf2;
  color: #92400e;
  border: 1px solid #fed7aa;
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 800;
}

.status-pill.finalized {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}

.member-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.member-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #f9fafb;
  color: var(--dark);
  padding: 0.25rem 0.55rem;
  font-size: 0.76rem;
  font-weight: 700;
}

.member-chip button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.member-chip button:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.9rem;
  flex-wrap: wrap;
}

.add-student-select {
  min-width: 260px;
  flex: 1;
}

.state-msg,
.empty-state,
.empty-inline {
  color: var(--muted);
  font-size: 0.85rem;
  text-align: center;
  padding: 1.5rem;
}

.empty-inline {
  border: 1px dashed #d1d5db;
  border-radius: 8px;
}

@media (max-width: 960px) {
  .groups-grid,
  .summary-strip {
    grid-template-columns: 1fr;
  }

  .group-form-panel {
    position: static;
  }
}

@media (max-width: 640px) {
  .student-groups-page {
    padding: 1rem;
  }

  .page-header,
  .group-card-head,
  .group-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .add-student-select {
    min-width: 0;
    width: 100%;
  }
}
</style>
