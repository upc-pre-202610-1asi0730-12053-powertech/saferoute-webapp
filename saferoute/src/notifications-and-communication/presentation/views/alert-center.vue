<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useIamStore } from '../../../identity-and-access-management/application/iam.store.js';
import { NotificationsApi } from '../../infrastructure/notification-api.js';
import { TripApi } from '../../../trip-execution-and-monitoring/infrastructure/trip-api.js';
import { StakeholderApi } from '../../../stakeholder-and-asset-management/infrastructure/stakeholder-api.js';

const iamStore = useIamStore();
const user     = iamStore.currentUser;
const isAdmin  = iamStore.isAdmin;
const toast    = useToast();
const orgId    = user?.organizationId || null;
const notificationsApi = new NotificationsApi();
const tripApi = new TripApi();
const stakeholderApi = new StakeholderApi();

// Backend state scoped by the current organization.
const currentParentId = ref(null);

const incidents = ref([]);
const notifications = ref([]);
const trips = ref([]);
const parents = ref([]);

// ── Tabs ──────────────────────────────────────────────────────
const activeTab = ref('incidents'); // 'incidents' | 'announcements' | 'notifications'

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

function toUiIncident(incident, trip) {
  return {
    ...incident,
    id: incident.id || `${trip.id}-${incident.reportedAt || Date.now()}`,
    tripId: trip.id,
    routeId: trip.routeId,
    routeName: trip.routeName || `Ruta ${trip.routeId}`,
    type: incident.type || 'OTRO',
    severity: incident.severity || 'LOW',
    timestamp: incident.timestamp || incident.reportedAt || new Date().toISOString(),
    status: incident.status || 'OPEN',
    organizationId: trip.organizationId || orgId,
  };
}

function tripRouteName(trip) {
  return trip.routeName || trip.name || `Ruta ${trip.routeId || trip.id}`;
}

function tripLabel(trip) {
  const routeName = tripRouteName(trip);
  const time = trip.scheduledStartTime || trip.startTime || '';
  return `#${trip.id} - ${routeName}${time ? ` (${time})` : ''}`;
}

function parentName(parent) {
  return parent.fullName || [parent.firstName, parent.lastName].filter(Boolean).join(' ') || parent.name || parent.email || `Padre ${parent.id}`;
}

async function loadAlertData() {
  if (!orgId) return;
  try {
    const [tripsRes, notificationsRes, parentsRes] = await Promise.all([
      tripApi.getTrips(orgId),
      notificationsApi.getMessages(orgId),
      stakeholderApi.getParentsByOrganization(orgId),
    ]);

    parents.value = parentsRes.data || [];
    const parent = parents.value.find(p => p.userId === user?.id || p.email === user?.email);
    currentParentId.value = parent?.id || null;
    trips.value = tripsRes.data || [];
    incidents.value = trips.value.flatMap(trip => (trip.incidents || []).map(incident => toUiIncident(incident, trip)));
    notifications.value = notificationsRes.data || [];
  } catch (error) {
    console.warn('Alert center data could not be loaded from backend:', error);
  }
}

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
  BOARDING: 'pi pi-check-circle', INCIDENT: 'pi pi-exclamation-triangle',
  ARRIVAL: 'pi pi-flag', ANNOUNCEMENT: 'pi pi-megaphone',
};
const NOTIF_SEVERITY = {
  ABORDAJE: '#22c55e', PROXIMIDAD: '#f59e0b', AUSENCIA: '#ef4444', LLEGADA: '#6366f1', RETRASO: '#f97316',
  BOARDING: '#22c55e', INCIDENT: '#ef4444', ARRIVAL: '#6366f1', ANNOUNCEMENT: '#0ea5e9',
};
const NOTIF_TITLES = {
  ABORDAJE:   'Abordaje confirmado',
  PROXIMIDAD: '¡Bus cerca!',
  AUSENCIA:   'Alumno ausente',
  LLEGADA:    'Bus llegó a destino',
  RETRASO:    'Retraso en ruta',
  BOARDING:   'Abordaje confirmado',
  INCIDENT:   'Incidencia reportada',
  ARRIVAL:    'Llegada registrada',
  ANNOUNCEMENT: 'Comunicado',
};
function notifTitle(type) { return NOTIF_TITLES[type] || 'Notificación'; }

const visibleNotifs = computed(() =>
  [...notifications.value]
    .filter(n => isAdmin || n.parentId === null || n.parentId === currentParentId.value)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
);

const unreadCount = computed(() => visibleNotifs.value.filter(n => !n.read).length);

const visibleAnnouncements = computed(() =>
  notifications.value
    .flatMap(notification =>
      (notification.announcements || []).map(announcement => ({
        ...announcement,
        id: announcement.id || `${notification.id}-${announcement.publishedAt || Date.now()}`,
        notificationId: notification.id,
        parentId: notification.parentId,
        tripId: notification.tripId,
        routeId: announcement.routeId,
        message: announcement.message || notification.message,
        publishedAt: announcement.publishedAt || notification.sentAt || notification.timestamp,
        routeName: trips.value.find(trip => String(trip.routeId) === String(announcement.routeId) || String(trip.id) === String(notification.tripId))?.routeName || '',
      }))
    )
    .filter(announcement => isAdmin || announcement.parentId === currentParentId.value)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
);

const parentOptions = computed(() =>
  parents.value.map(parent => ({
    label: `${parentName(parent)}${parent.email ? ` - ${parent.email}` : ''}`,
    value: String(parent.id),
  }))
);

function markRead(n) {
  const idx = notifications.value.findIndex(x => x.id === n.id);
  if (idx !== -1) notifications.value[idx] = { ...notifications.value[idx], read: true };
}
function markAllRead() {
  visibleNotifs.value.forEach(n => {
    const idx = notifications.value.findIndex(x => x.id === n.id);
    if (idx !== -1) notifications.value[idx] = { ...notifications.value[idx], read: true };
  });
}

// ── New incident form ─────────────────────────────────────────
const newDialog = ref(false);
const emptyForm = () => ({
  tripId: null, routeName: '', type: 'OTRO', severity: 'LOW', description: '',
});
const form = ref(emptyForm());

function openNew() { form.value = emptyForm(); newDialog.value = true; }

async function saveIncident() {
  if (!form.value.description || !form.value.tripId) return;
  const trip = trips.value.find(t => t.id === form.value.tripId);
  try {
    const response = await tripApi.reportIncident(form.value.tripId, {
      description: `[${form.value.type}/${form.value.severity}] ${form.value.description}`,
      type: form.value.type,
      severity: form.value.severity,
      reportedBy: user?.id || 'UNKNOWN',
    });
    incidents.value.unshift(toUiIncident(response.data, trip || { id: form.value.tripId, organizationId: orgId }));
    newDialog.value = false;
  } catch (error) {
    console.warn('Incident could not be reported:', error);
  }
}

// Comunicados
const announcementDialog = ref(false);
const announcementSaving = ref(false);
const emptyAnnouncementForm = () => ({
  tripId: null,
  recipientMode: 'ALL',
  parentIds: [],
  message: '',
});
const announcementForm = ref(emptyAnnouncementForm());

const selectedAnnouncementTrip = computed(() =>
  trips.value.find(trip => String(trip.id) === String(announcementForm.value.tripId)) || null
);

function openAnnouncementDialog() {
  announcementForm.value = emptyAnnouncementForm();
  announcementDialog.value = true;
}

function recipientParentIds() {
  if (announcementForm.value.recipientMode === 'SELECTED') {
    return announcementForm.value.parentIds.map(String);
  }
  return parents.value.map(parent => String(parent.id));
}

async function saveAnnouncement() {
  const trip = selectedAnnouncementTrip.value;
  const message = announcementForm.value.message.trim();
  const targetParentIds = recipientParentIds();
  if (!trip || !message || !targetParentIds.length) return;

  announcementSaving.value = true;
  try {
    const createdNotifications = await Promise.all(targetParentIds.map(parentId =>
      notificationsApi.createNotification({
        organizationId: orgId,
        parentId,
        tripId: trip.id,
        category: 'ANNOUNCEMENT',
        type: 'ANNOUNCEMENT',
        message,
        content: message,
      })
    ));

    const createdAnnouncements = await Promise.all(createdNotifications.map(response =>
      notificationsApi.createAnnouncement({
        notificationId: response.data.id,
        routeId: trip.routeId || trip.id,
        message,
      })
    ));

    createdNotifications.forEach((response, index) => {
      const notification = response.data;
      const announcement = createdAnnouncements[index]?.data;
      notifications.value.unshift({
        ...notification,
        type: 'ANNOUNCEMENT',
        title: 'Comunicado',
        content: message,
        timestamp: notification.timestamp || notification.sentAt || new Date().toISOString(),
        announcements: announcement ? [announcement] : notification.announcements || [],
      });
    });

    announcementDialog.value = false;
    activeTab.value = 'announcements';
    toast.add({ severity: 'success', summary: 'Comunicado enviado', detail: `${targetParentIds.length} destinatario${targetParentIds.length === 1 ? '' : 's'}`, life: 3500 });
  } catch (error) {
    console.warn('Announcement could not be sent:', error);
    toast.add({ severity: 'error', summary: 'No se pudo enviar', detail: 'Revisa el viaje, destinatarios y mensaje.', life: 4500 });
  } finally {
    announcementSaving.value = false;
  }
}

function resolveIncident(inc) {
  const idx = incidents.value.findIndex(i => i.id === inc.id);
  if (idx !== -1) incidents.value[idx] = { ...incidents.value[idx], status: 'RESOLVED' };
}

function fmt(ts) {
  return new Date(ts).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
}

onMounted(loadAlertData);
</script>

<template>
  <div class="alert-center">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Centro de Alertas</h1>
        <p class="page-sub">Incidencias y notificaciones del transporte escolar</p>
      </div>
      <div class="header-actions">
        <pv-button label="Reportar Incidencia" icon="pi pi-exclamation-triangle" outlined @click="openNew"/>
        <pv-button v-if="isAdmin" label="Enviar Comunicado" icon="pi pi-megaphone" @click="openAnnouncementDialog"/>
      </div>
    </div>

    <!-- Tabs -->
    <div class="ac-tabs">
      <button class="ac-tab" :class="{ active: activeTab === 'incidents' }" @click="activeTab = 'incidents'">
        <i class="pi pi-exclamation-triangle"/> Incidencias ({{ incidents.length }})
      </button>
      <button class="ac-tab" :class="{ active: activeTab === 'announcements' }" @click="activeTab = 'announcements'">
        <i class="pi pi-megaphone"/> Comunicados ({{ visibleAnnouncements.length }})
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
    <template v-if="activeTab === 'announcements'">
      <div class="notif-header-row">
        <span class="notif-count">{{ visibleAnnouncements.length }} comunicados publicados</span>
        <pv-button v-if="isAdmin" label="Enviar comunicado" icon="pi pi-megaphone" size="small" @click="openAnnouncementDialog"/>
      </div>

      <div v-if="visibleAnnouncements.length === 0" class="empty-state">
        <i class="pi pi-megaphone empty-icon"/>
        <p>No hay comunicados publicados.</p>
      </div>

      <div class="announcement-list">
        <article v-for="announcement in visibleAnnouncements" :key="announcement.id" class="announcement-card">
          <div class="announcement-icon">
            <i class="pi pi-megaphone"/>
          </div>
          <div class="announcement-body">
            <div class="announcement-head">
              <strong>Comunicado</strong>
              <span>{{ fmt(announcement.publishedAt) }}</span>
            </div>
            <p>{{ announcement.message }}</p>
            <div class="inc-meta">
              <span v-if="announcement.routeName"><i class="pi pi-map-marker"/> {{ announcement.routeName }}</span>
              <span v-else-if="announcement.routeId"><i class="pi pi-map-marker"/> Ruta #{{ announcement.routeId }}</span>
              <span v-if="announcement.tripId"><i class="pi pi-car"/> Viaje #{{ announcement.tripId }}</span>
            </div>
          </div>
        </article>
      </div>
    </template>

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
    <pv-dialog
      v-model:visible="newDialog"
      header="Reportar Incidencia"
      modal
      :draggable="false"
      class="communication-dialog">
      <div class="form-grid">
        <div class="field">
          <label>Viaje *</label>
          <pv-select
            v-model="form.tripId"
            :options="trips"
            :option-label="t => `#${t.id} — ${t.routeName}`"
            option-value="id"
            placeholder="Seleccionar viaje..."
            class="w-full"
            show-clear>
            <template #value="{ value, placeholder }">
              <span v-if="value" class="select-value-text">{{ tripLabel(trips.find(t => String(t.id) === String(value)) || { id: value }) }}</span>
              <span v-else>{{ placeholder }}</span>
            </template>
            <template #option="{ option }">
              <div class="select-option">
                <strong>#{{ option.id }}</strong>
                <span>{{ tripRouteName(option) }}</span>
              </div>
            </template>
          </pv-select>
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
        <pv-button label="Reportar" icon="pi pi-send" :disabled="!form.description || !form.tripId" @click="saveIncident"/>
      </template>
    </pv-dialog>

    <pv-dialog
      v-model:visible="announcementDialog"
      header="Enviar Comunicado"
      modal
      :draggable="false"
      class="communication-dialog">
      <div class="form-grid">
        <div class="field full">
          <label>Viaje / ruta *</label>
          <pv-select
            v-model="announcementForm.tripId"
            :options="trips"
            :option-label="tripLabel"
            option-value="id"
            placeholder="Seleccionar viaje..."
            class="w-full"
            show-clear>
            <template #value="{ value, placeholder }">
              <span v-if="value" class="select-value-text">{{ tripLabel(trips.find(t => String(t.id) === String(value)) || { id: value }) }}</span>
              <span v-else>{{ placeholder }}</span>
            </template>
            <template #option="{ option }">
              <div class="select-option">
                <strong>#{{ option.id }}</strong>
                <span>{{ tripRouteName(option) }}</span>
              </div>
            </template>
          </pv-select>
        </div>

        <div class="field full">
          <label>Destinatarios</label>
          <pv-select
            v-model="announcementForm.recipientMode"
            :options="[{ value: 'ALL', label: 'Todos los padres' }, { value: 'SELECTED', label: 'Padres seleccionados' }]"
            option-label="label"
            option-value="value"
            class="w-full"/>
        </div>

        <div v-if="announcementForm.recipientMode === 'SELECTED'" class="field full">
          <label>Padres *</label>
          <pv-multi-select
            v-model="announcementForm.parentIds"
            :options="parentOptions"
            option-label="label"
            option-value="value"
            placeholder="Seleccionar padres..."
            display="chip"
            class="w-full"/>
        </div>

        <div class="field full">
          <label>Mensaje *</label>
          <pv-textarea
            v-model="announcementForm.message"
            rows="5"
            class="w-full"
            placeholder="Ej: La Ruta Norte tendra una demora aproximada de 10 minutos por trafico."/>
        </div>
      </div>
      <template #footer>
        <pv-button label="Cancelar" text @click="announcementDialog = false"/>
        <pv-button
          label="Enviar comunicado"
          icon="pi pi-send"
          :loading="announcementSaving"
          :disabled="!announcementForm.tripId || !announcementForm.message.trim() || (announcementForm.recipientMode === 'SELECTED' && !announcementForm.parentIds.length)"
          @click="saveAnnouncement"/>
      </template>
    </pv-dialog>
  </div>
</template>

<style scoped>
.alert-center { padding: 1.75rem; background: var(--bg); min-height: 100vh; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem;
}
.page-title { font-family: var(--heading); font-size: 1.6rem; font-weight: 800; color: var(--dark); margin: 0 0 0.25rem; }
.page-sub   { font-size: 0.875rem; color: var(--muted); margin: 0; }
.header-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; justify-content: flex-end; }

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

.announcement-list { display: flex; flex-direction: column; gap: 0.75rem; }
.announcement-card {
  display: flex; gap: 0.85rem; align-items: flex-start;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 0.95rem 1rem;
}
.announcement-icon {
  width: 36px; height: 36px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: #e0f2fe; color: #0284c7; flex-shrink: 0;
}
.announcement-body { flex: 1; min-width: 0; }
.announcement-head {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  margin-bottom: 0.35rem;
}
.announcement-head strong { color: var(--dark); font-size: 0.88rem; }
.announcement-head span { color: var(--muted); font-size: 0.74rem; white-space: nowrap; }
.announcement-body p { margin: 0 0 0.5rem; color: #374151; font-size: 0.86rem; line-height: 1.45; }

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
.communication-dialog { width: min(92vw, 560px); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-grid .full { grid-column: 1 / -1; }
.field { display: flex; flex-direction: column; gap: 0.3rem; }
.field label { font-size: 0.85rem; font-weight: 600; color: var(--dark); }
.select-value-text {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.select-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.5rem;
  align-items: center;
  max-width: 100%;
}
.select-option strong { color: var(--dark); font-size: 0.78rem; }
.select-option span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #374151;
  font-size: 0.82rem;
}

@media (max-width: 680px) {
  .alert-center { padding: 1rem; }
  .page-header { flex-direction: column; }
  .header-actions { width: 100%; justify-content: stretch; }
  .header-actions :deep(.p-button) { flex: 1; }
  .ac-tabs { overflow-x: auto; }
  .ac-tab { flex-shrink: 0; padding-inline: 1rem; }
  .form-grid { grid-template-columns: 1fr; }
  .incident-card,
  .announcement-card { flex-direction: column; }
  .inc-actions { align-self: flex-start; }
}
</style>
