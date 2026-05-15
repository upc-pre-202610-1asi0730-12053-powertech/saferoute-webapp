<script setup>
import { ref, computed } from 'vue';
import { useIamStore } from '../../../identity-and-access-management/application/iam.store.js';
import seedData from '../../../server/db.json';

const iamStore = useIamStore();
const user     = iamStore.currentUser;
const isAdmin  = iamStore.isAdmin;
const orgId    = user?.organizationId || null;

// ── Load seed data + localStorage extras — scoped by org ─────
const INCIDENTS_KEY  = `saferoute.incidents.${orgId || 'default'}`;
const NOTIFS_KEY     = `saferoute.notifications.${orgId || 'default'}`;

function loadIncidents() {
  const extra = JSON.parse(localStorage.getItem(INCIDENTS_KEY) || '[]');
  const seed  = orgId ? seedData.incidents.filter(i => i.organizationId === orgId) : [];
  return [...seed, ...extra];
}
function loadNotifs() {
  const state = JSON.parse(localStorage.getItem(NOTIFS_KEY + '.state') || '{}');
  const extra = JSON.parse(localStorage.getItem(NOTIFS_KEY + '.extra') || '[]');
  const seed  = orgId ? seedData.notifications.filter(n => n.organizationId === orgId) : [];
  const base  = [...seed, ...extra];
  return base.map(n => state[n.id] ? { ...n, ...state[n.id] } : n);
}

const incidents    = ref(loadIncidents());
const notifications = ref(loadNotifs());

// ── Tabs ──────────────────────────────────────────────────────
const activeTab = ref('incidents'); // 'incidents' | 'notifications'

// ── Incident filters ──────────────────────────────────────────
const filterStatus   = ref('ALL');
const filterSeverity = ref('ALL');
const filterType     = ref('ALL');

const INCIDENT_TYPES = [
  { value: 'ALL',             label: 'Todos los tipos' },
  { value: 'RETRASO',         label: 'Retraso' },
  { value: 'AVERIA',          label: 'Avería' },
  { value: 'ACCIDENTE',       label: 'Accidente' },
  { value: 'COMPORTAMIENTO',  label: 'Comportamiento' },
  { value: 'EMERGENCIA',      label: 'Emergencia' },
  { value: 'OTRO',            label: 'Otro' },
];

const SEVERITY_LABELS  = { LOW: 'Leve', MEDIUM: 'Moderado', HIGH: 'Grave' };
const SEVERITY_COLORS  = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444' };
const TYPE_ICONS = {
  RETRASO: 'pi pi-clock', AVERIA: 'pi pi-wrench', ACCIDENTE: 'pi pi-exclamation-triangle',
  COMPORTAMIENTO: 'pi pi-user', EMERGENCIA: 'pi pi-phone', OTRO: 'pi pi-info-circle',
};

const filteredIncidents = computed(() => {
  let list = incidents.value;
  if (filterStatus.value   !== 'ALL') list = list.filter(i => i.status   === filterStatus.value);
  if (filterSeverity.value !== 'ALL') list = list.filter(i => i.severity === filterSeverity.value);
  if (filterType.value     !== 'ALL') list = list.filter(i => i.type     === filterType.value);
  return [...list].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
});

// ── Notification helpers ──────────────────────────────────────
const NOTIF_ICONS = {
  ABORDAJE: 'pi pi-check-circle', PROXIMIDAD: 'pi pi-map-marker',
  AUSENCIA: 'pi pi-times-circle', LLEGADA: 'pi pi-flag', RETRASO: 'pi pi-clock',
};
const NOTIF_SEVERITY = {
  ABORDAJE: '#22c55e', PROXIMIDAD: '#f59e0b', AUSENCIA: '#ef4444', LLEGADA: '#6366f1', RETRASO: '#f97316',
};
const NOTIF_TITLES = {
  ABORDAJE:   'Abordaje confirmado',
  PROXIMIDAD: '¡Bus cerca!',
  AUSENCIA:   'Alumno ausente',
  LLEGADA:    'Bus llegó a destino',
  RETRASO:    'Retraso en ruta',
};
function notifTitle(type) { return NOTIF_TITLES[type] || 'Notificación'; }

const visibleNotifs = computed(() =>
  [...notifications.value]
    .filter(n => isAdmin || n.parentId === null || n.parentId === userParentId.value)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
);

const userParentId = computed(() => {
  const p = seedData.parents?.find(p => p.email === user?.email);
  return p?.id || null;
});

const unreadCount = computed(() => visibleNotifs.value.filter(n => !n.read).length);

function markRead(n) {
  const idx = notifications.value.findIndex(x => x.id === n.id);
  if (idx !== -1) notifications.value[idx] = { ...notifications.value[idx], read: true };
  // persist state
  const state = JSON.parse(localStorage.getItem(NOTIFS_KEY + '.state') || '{}');
  state[n.id] = { read: true };
  localStorage.setItem(NOTIFS_KEY + '.state', JSON.stringify(state));
}
function markAllRead() {
  const state = JSON.parse(localStorage.getItem(NOTIFS_KEY + '.state') || '{}');
  visibleNotifs.value.forEach(n => {
    const idx = notifications.value.findIndex(x => x.id === n.id);
    if (idx !== -1) notifications.value[idx] = { ...notifications.value[idx], read: true };
    state[n.id] = { read: true };
  });
  localStorage.setItem(NOTIFS_KEY + '.state', JSON.stringify(state));
}

// ── New incident form ─────────────────────────────────────────
const newDialog = ref(false);
const emptyForm = () => ({
  tripId: null, routeName: '', type: 'OTRO', severity: 'LOW', description: '',
});
const form = ref(emptyForm());

const trips = computed(() => {
  const extra = JSON.parse(localStorage.getItem(`saferoute.mock.trips.extra.${orgId || 'default'}`) || '[]');
  const seed  = orgId ? seedData.trips.filter(t => t.organizationId === orgId) : [];
  return [...seed, ...extra];
});

function openNew() { form.value = emptyForm(); newDialog.value = true; }

function saveIncident() {
  if (!form.value.description) return;
  const trip = trips.value.find(t => t.id === form.value.tripId);
  const incident = {
    id:          `i-${Date.now()}`,
    tripId:      form.value.tripId,
    routeId:     trip?.routeId || null,
    routeName:   trip?.routeName || form.value.routeName,
    type:        form.value.type,
    severity:    form.value.severity,
    description: form.value.description,
    reportedBy:  user?.id || 'UNKNOWN',
    timestamp:   new Date().toISOString(),
    status:      'OPEN',
    organizationId: orgId,
  };
  incidents.value.unshift(incident);
  const extra = JSON.parse(localStorage.getItem(INCIDENTS_KEY) || '[]');
  extra.push(incident);
  localStorage.setItem(INCIDENTS_KEY, JSON.stringify(extra));
  newDialog.value = false;
}

function resolveIncident(inc) {
  const idx = incidents.value.findIndex(i => i.id === inc.id);
  if (idx !== -1) incidents.value[idx] = { ...incidents.value[idx], status: 'RESOLVED' };
}

function fmt(ts) {
  return new Date(ts).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
}
</script>

<template>
  <div class="alert-center">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Centro de Alertas</h1>
        <p class="page-sub">Incidencias y notificaciones del transporte escolar</p>
      </div>
      <pv-button label="Reportar Incidencia" icon="pi pi-plus" @click="openNew"/>
    </div>

    <!-- Tabs -->
    <div class="ac-tabs">
      <button class="ac-tab" :class="{ active: activeTab === 'incidents' }" @click="activeTab = 'incidents'">
        <i class="pi pi-exclamation-triangle"/> Incidencias ({{ incidents.length }})
      </button>
      <button class="ac-tab" :class="{ active: activeTab === 'notifications' }" @click="activeTab = 'notifications'">
        <i class="pi pi-bell"/> Notificaciones
        <span v-if="unreadCount > 0" class="unread-dot">{{ unreadCount }}</span>
      </button>
    </div>

    <!-- ══ INCIDENTS ══ -->
    <template v-if="activeTab === 'incidents'">
      <!-- Filters -->
      <div class="filters-row">
        <pv-select v-model="filterType"     :options="INCIDENT_TYPES"   option-label="label" option-value="value" class="filter-select" placeholder="Tipo"/>
        <pv-select v-model="filterSeverity" :options="[{ value: 'ALL', label: 'Toda gravedad' }, { value: 'LOW', label: 'Leve' }, { value: 'MEDIUM', label: 'Moderado' }, { value: 'HIGH', label: 'Grave' }]" option-label="label" option-value="value" class="filter-select" placeholder="Gravedad"/>
        <pv-select v-model="filterStatus"   :options="[{ value: 'ALL', label: 'Todos los estados' }, { value: 'OPEN', label: 'Abierto' }, { value: 'RESOLVED', label: 'Resuelto' }]" option-label="label" option-value="value" class="filter-select" placeholder="Estado"/>
      </div>

      <div v-if="filteredIncidents.length === 0" class="empty-state">
        <i class="pi pi-check-circle empty-icon"/>
        <p>No hay incidencias con los filtros actuales.</p>
      </div>

      <div class="incident-list">
        <div v-for="inc in filteredIncidents" :key="inc.id" class="incident-card" :class="inc.status.toLowerCase()">
          <div class="inc-icon-col">
            <div class="inc-icon" :style="{ background: SEVERITY_COLORS[inc.severity] + '22', color: SEVERITY_COLORS[inc.severity] }">
              <i :class="TYPE_ICONS[inc.type] || 'pi pi-info-circle'"/>
            </div>
          </div>
          <div class="inc-body">
            <div class="inc-row1">
              <span class="inc-type">{{ INCIDENT_TYPES.find(t => t.value === inc.type)?.label || inc.type }}</span>
              <span class="sev-badge" :style="{ background: SEVERITY_COLORS[inc.severity] + '22', color: SEVERITY_COLORS[inc.severity] }">
                {{ SEVERITY_LABELS[inc.severity] }}
              </span>
              <span class="status-badge" :class="inc.status.toLowerCase()">
                {{ inc.status === 'OPEN' ? 'Abierto' : 'Resuelto' }}
              </span>
            </div>
            <p class="inc-desc">{{ inc.description }}</p>
            <div class="inc-meta">
              <span v-if="inc.routeName"><i class="pi pi-map-marker"/> {{ inc.routeName }}</span>
              <span v-if="inc.tripId"><i class="pi pi-car"/> Viaje #{{ inc.tripId }}</span>
              <span><i class="pi pi-clock"/> {{ fmt(inc.timestamp) }}</span>
            </div>
          </div>
          <div v-if="isAdmin && inc.status === 'OPEN'" class="inc-actions">
            <pv-button label="Resolver" icon="pi pi-check" size="small" outlined @click="resolveIncident(inc)"/>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ NOTIFICATIONS ══ -->
    <template v-if="activeTab === 'notifications'">
      <div class="notif-header-row">
        <span class="notif-count">{{ visibleNotifs.length }} notificaciones</span>
        <pv-button v-if="unreadCount > 0" label="Marcar todas leídas" text size="small" @click="markAllRead"/>
      </div>

      <div v-if="visibleNotifs.length === 0" class="empty-state">
        <i class="pi pi-bell-slash empty-icon"/>
        <p>No hay notificaciones.</p>
      </div>

      <div class="notif-list">
        <div
          v-for="n in visibleNotifs"
          :key="n.id"
          class="notif-item"
          :class="{ unread: !n.read }"
          @click="markRead(n)">
          <div class="notif-dot-col">
            <div class="notif-icon" :style="{ color: NOTIF_SEVERITY[n.type] || '#6b7280' }">
              <i :class="NOTIF_ICONS[n.type] || 'pi pi-bell'"/>
            </div>
            <div v-if="!n.read" class="unread-indicator"/>
          </div>
          <div class="notif-body">
            <p class="notif-title-text">{{ notifTitle(n.type) }}</p>
            <p class="notif-msg">{{ n.message }}</p>
            <span class="notif-time">{{ fmt(n.timestamp) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ── New incident dialog ──────────────────────────────── -->
    <pv-dialog v-model:visible="newDialog" header="Reportar Incidencia" modal style="width: 480px">
      <div class="form-grid">
        <div class="field">
          <label>Viaje (opcional)</label>
          <pv-select
            v-model="form.tripId"
            :options="trips"
            :option-label="t => `#${t.id} — ${t.routeName}`"
            option-value="id"
            placeholder="Seleccionar viaje..."
            class="w-full"
            show-clear/>
        </div>
        <div class="field">
          <label>Tipo de Incidencia *</label>
          <pv-select v-model="form.type" :options="INCIDENT_TYPES.slice(1)" option-label="label" option-value="value" class="w-full"/>
        </div>
        <div class="field">
          <label>Gravedad</label>
          <pv-select v-model="form.severity" :options="[{ value: 'LOW', label: 'Leve' }, { value: 'MEDIUM', label: 'Moderado' }, { value: 'HIGH', label: 'Grave' }]" option-label="label" option-value="value" class="w-full"/>
        </div>
        <div class="field full">
          <label>Descripción *</label>
          <pv-textarea v-model="form.description" rows="4" class="w-full" placeholder="Describe la incidencia con detalle..."/>
        </div>
      </div>
      <template #footer>
        <pv-button label="Cancelar" text @click="newDialog = false"/>
        <pv-button label="Reportar" icon="pi pi-send" :disabled="!form.description" @click="saveIncident"/>
      </template>
    </pv-dialog>
  </div>
</template>

<style scoped>
.alert-center { padding: 1.75rem; background: var(--bg); min-height: 100vh; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem;
}
.page-title { font-family: var(--heading); font-size: 1.6rem; font-weight: 800; color: var(--dark); margin: 0 0 0.25rem; }
.page-sub   { font-size: 0.875rem; color: var(--muted); margin: 0; }

/* Tabs */
.ac-tabs { display: flex; gap: 0; margin-bottom: 1.25rem; border-bottom: 2px solid #e5e7eb; }
.ac-tab {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.65rem 1.4rem; border: none; background: none;
  font-size: 0.9rem; font-weight: 600; color: var(--muted);
  cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
}
.ac-tab:hover  { color: var(--dark); }
.ac-tab.active { color: var(--dark); border-bottom-color: var(--amber); }

.unread-dot {
  background: #ef4444; color: #fff;
  font-size: 0.65rem; font-weight: 700;
  padding: 1px 5px; border-radius: 10px; min-width: 18px; text-align: center;
}

/* Filters */
.filters-row { display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
.filter-select { min-width: 160px; }

/* Incident cards */
.incident-list { display: flex; flex-direction: column; gap: 0.75rem; }

.incident-card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
  padding: 1rem 1.1rem; display: flex; gap: 1rem; align-items: flex-start;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.incident-card.resolved { opacity: 0.65; }

.inc-icon-col { flex-shrink: 0; }
.inc-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem;
}
.inc-body { flex: 1; display: flex; flex-direction: column; gap: 0.35rem; }
.inc-row1 { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.inc-type { font-weight: 700; font-size: 0.9rem; color: var(--dark); }

.sev-badge {
  font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 20px;
}
.status-badge {
  font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 20px;
}
.status-badge.open     { background: #fef9c3; color: #854d0e; }
.status-badge.resolved { background: #dcfce7; color: #15803d; }

.inc-desc { margin: 0; font-size: 0.875rem; color: var(--dark); }
.inc-meta { display: flex; gap: 1rem; flex-wrap: wrap; }
.inc-meta span { font-size: 0.75rem; color: var(--muted); display: flex; align-items: center; gap: 0.25rem; }

.inc-actions { flex-shrink: 0; align-self: center; }

/* Notifications */
.notif-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.notif-count { font-size: 0.85rem; color: var(--muted); }

.notif-list { display: flex; flex-direction: column; gap: 0.5rem; }

.notif-item {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 0.85rem 1rem; display: flex; gap: 0.85rem;
  cursor: pointer; transition: background 0.12s;
}
.notif-item:hover     { background: #fffbf2; }
.notif-item.unread    { border-left: 3px solid var(--amber); }

.notif-dot-col { position: relative; flex-shrink: 0; }
.notif-icon { font-size: 1.1rem; padding-top: 2px; }
.unread-indicator {
  position: absolute; top: 0; right: -2px;
  width: 8px; height: 8px; border-radius: 50%;
  background: #ef4444; border: 2px solid #fff;
}
.notif-body       { flex: 1; }
.notif-title-text { margin: 0 0 2px; font-size: 0.82rem; font-weight: 700; color: var(--dark); }
.notif-msg        { margin: 0 0 4px; font-size: 0.82rem; color: #374151; }
.notif-time       { font-size: 0.72rem; color: var(--muted); }

/* Empty state */
.empty-state {
  text-align: center; padding: 3rem 1rem; color: var(--muted);
}
.empty-icon { font-size: 2.5rem; color: #d1d5db; display: block; margin-bottom: 0.75rem; }

/* Dialog form */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-grid .full { grid-column: 1 / -1; }
.field { display: flex; flex-direction: column; gap: 0.3rem; }
.field label { font-size: 0.85rem; font-weight: 600; color: var(--dark); }
</style>
