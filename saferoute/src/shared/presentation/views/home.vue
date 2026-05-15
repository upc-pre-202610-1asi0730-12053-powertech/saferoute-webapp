<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useIamStore } from "../../../identity-and-access-management/application/iam.store.js";
import seedData from "../../../server/db.json";

const { t } = useI18n();
const router = useRouter();
const store = useIamStore();
const user = store.currentUser;

const roleIcon = computed(() => {
  switch (user?.roleTier) {
    case 'ADMIN':  return 'pi pi-shield';
    case 'DRIVER': return 'pi pi-car';
    case 'PARENT': return 'pi pi-heart';
    default:       return 'pi pi-user';
  }
});

const roleLabel = computed(() => t(`home.role.${user?.roleTier?.toLowerCase() || 'guest'}`));

// ── Metrics ───────────────────────────────────────────────────
function getMockTrips() {
  const orgId    = user?.organizationId;
  const extraKey = `saferoute.mock.trips.extra.${orgId || 'default'}`;
  const stateKey = `saferoute.mock.trips.state.${orgId || 'default'}`;
  const extra    = JSON.parse(localStorage.getItem(extraKey) || '[]');
  const state    = JSON.parse(localStorage.getItem(stateKey) || '{}');
  const seed     = orgId ? seedData.trips.filter(t => t.organizationId === orgId) : [];
  const base     = [...seed, ...extra];
  return base.map(tr => state[tr.id] ? { ...tr, ...state[tr.id] } : tr);
}

const metrics = computed(() => {
  const trips   = getMockTrips();
  const role    = user?.roleTier;
  const myId    = user?.id;

  const orgId = user?.organizationId;

  if (role === 'DRIVER') {
    const myRoutes = trips.filter(tr => tr.driverId === myId); // use trips which are already org-scoped
    const myTrips  = trips.filter(tr => tr.driverId === myId);
    return [
      { icon: 'pi pi-map-marker', value: [...new Set(myRoutes.map(t => t.routeId))].length,    label: 'My Routes' },
      { icon: 'pi pi-car',        value: myTrips.filter(tr => tr.status === 'EN_ROUTE').length, label: 'Trips Active' },
      { icon: 'pi pi-users',      value: [...new Set(myTrips.flatMap(t => t.studentIds || []))].length, label: 'Students Served' },
    ];
  }

  if (role === 'PARENT') {
    const parents  = (seedData.parents  || []).filter(p => !orgId || p.organizationId === orgId);
    const children = (seedData.children || []).filter(c => !orgId || c.organizationId === orgId);
    const myParent = parents.find(p => p.email === user?.email);
    const myKids   = myParent ? children.filter(c => c.parentId === myParent.id) : [];
    const kidIds   = myKids.map(c => c.id);
    const liveTrips = trips.filter(tr => tr.status === 'EN_ROUTE' && kidIds.some(id => (tr.studentIds || []).includes(id)));
    return [
      { icon: 'pi pi-graduation-cap', value: myKids.length,   label: 'My Children' },
      { icon: 'pi pi-car',            value: liveTrips.length, label: 'Trips Active' },
      { icon: 'pi pi-map-marker',     value: trips.filter(r => r.studentIds?.some(id => kidIds.includes(id))).length, label: 'Routes Assigned' },
    ];
  }

  // ADMIN — all counts are already org-scoped via getMockTrips()
  const orgRoutes = [...new Set(trips.map(t => t.routeId))].length;
  const orgUsers  = (seedData.users || []).filter(u => !orgId || u.organizationId === orgId).length;
  return [
    { icon: 'pi pi-map-marker', value: orgRoutes,                                           label: 'Routes' },
    { icon: 'pi pi-car',        value: trips.filter(tr => tr.status === 'EN_ROUTE').length, label: 'Trips in Route' },
    { icon: 'pi pi-users',      value: orgUsers,                                             label: 'Users' },
  ];
});
</script>

<template>
  <div class="home-view p-4">
    <div class="welcome-header mb-5">
      <h1>{{ t('home.greeting', { name: user?.firstName || '' }) }}</h1>
      <span class="role-badge">
        <i :class="roleIcon" class="mr-1"/>
        {{ roleLabel }}
      </span>
    </div>

    <!-- Metrics row -->
    <div class="metrics-row mb-5">
      <div v-for="m in metrics" :key="m.label" class="metric-card">
        <i :class="m.icon" class="metric-icon"/>
        <span class="metric-value">{{ m.value }}</span>
        <span class="metric-label">{{ m.label }}</span>
      </div>
    </div>

    <!-- ADMIN dashboard -->
    <div v-if="store.isAdmin" class="admin-dashboard">
      <h2 class="actions-title">What would you like to do?</h2>
      <div class="dashboard-grid">
        <div class="dash-card" @click="router.push({ path: '/stakeholder-and-asset-management/management', query: { tab: 'drivers' } })">
          <i class="pi pi-id-card dash-icon"/>
          <h3>Register Drivers</h3>
          <p>Gestiona conductores: licencias, vehículo asignado y estado.</p>
        </div>
        <div class="dash-card" @click="router.push('/fleet-and-route-planning/management')">
          <i class="pi pi-map-marker dash-icon"/>
          <h3>Register Routes</h3>
          <p>Crea rutas con paradas, conductor, vehículo y horario.</p>
        </div>
        <div class="dash-card" @click="router.push({ path: '/stakeholder-and-asset-management/management', query: { tab: 'children' } })">
          <i class="pi pi-graduation-cap dash-icon"/>
          <h3>Register Students</h3>
          <p>Registra alumnos y vincúlalos con sus padres.</p>
        </div>
        <div class="dash-card" @click="router.push({ path: '/stakeholder-and-asset-management/management', query: { tab: 'parents' } })">
          <i class="pi pi-users dash-icon"/>
          <h3>Register Parent</h3>
          <p>Administra padres de familia y datos de contacto.</p>
        </div>
        <div class="dash-card" @click="router.push('/identity-and-access-management/organization')">
          <i class="pi pi-shield dash-icon"/>
          <h3>Assign Roles</h3>
          <p>Asigna roles ADMIN / DRIVER / PARENT a los usuarios.</p>
        </div>
      </div>
    </div>

    <!-- DRIVER dashboard -->
    <div v-else-if="user?.roleTier === 'DRIVER'" class="dashboard-grid">
      <div class="dash-card" @click="router.push('/trip-execution-and-monitoring/trips')">
        <i class="pi pi-car dash-icon"/>
        <h3>{{ t('home.driver.trips') }}</h3>
        <p>{{ t('home.driver.trips-desc') }}</p>
      </div>
      <div class="dash-card" @click="router.push('/fleet-and-route-planning/routes')">
        <i class="pi pi-map-marker dash-icon"/>
        <h3>{{ t('home.driver.routes') }}</h3>
        <p>{{ t('home.driver.routes-desc') }}</p>
      </div>
      <div class="dash-card" @click="router.push('/notifications-and-communication/alerts')">
        <i class="pi pi-bell dash-icon"/>
        <h3>{{ t('home.driver.alerts') }}</h3>
        <p>{{ t('home.driver.alerts-desc') }}</p>
      </div>
    </div>

    <!-- PARENT dashboard -->
    <div v-else-if="user?.roleTier === 'PARENT'" class="admin-dashboard">
      <h2 class="actions-title">What would you like to do?</h2>
      <div class="dashboard-grid">
        <div class="dash-card" @click="router.push('/trip-execution-and-monitoring/tracking')">
          <i class="pi pi-heart dash-icon"/>
          <h3>My Child</h3>
          <p>Sigue en tiempo real el viaje y la ubicación de tu hijo.</p>
        </div>
        <div class="dash-card" @click="router.push('/notifications-and-communication/alerts')">
          <i class="pi pi-exclamation-triangle dash-icon"/>
          <h3>Incident Report</h3>
          <p>Revisa reportes de incidentes ocurridos durante los viajes.</p>
        </div>
        <div class="dash-card" @click="router.push('/trip-execution-and-monitoring/attendance')">
          <i class="pi pi-check-square dash-icon"/>
          <h3>Check Assistance</h3>
          <p>Verifica la asistencia y estado de abordaje de tu hijo.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view { background: var(--bg); min-height: 100%; }
.welcome-header h1 { margin: 0 0 0.5rem; font-size: 1.75rem; color: var(--dark); }
.role-badge {
  display: inline-flex;
  align-items: center;
  background: rgb(22 48 90);
  color: var(--dark);
  padding: 0.3rem 0.85rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
}
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
}
.dash-card {
  background: #F8F9FB;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
  text-align: center;
}
.dash-card:hover {
  box-shadow: 0 6px 24px rgba(26,26,46,0.12);
  transform: translateY(-3px);
  border-color: var(--amber);
}
.dash-icon {
  font-size: 2rem;
  color: var(--dark);
  margin-bottom: 0.75rem;
  display: block;
}
.dash-card h3 { margin: 0 0 0.4rem; font-size: 1rem; color: var(--dark); }
.dash-card p  { margin: 0; font-size: 0.85rem; color: var(--muted); }

/* ── Admin "What would you like to do?" panel ────────────── */
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}
.actions-title {
  font-family: var(--heading);
  font-size: 2.0rem;
  font-weight: 700;
  color: var(--navy, #16305a);
  margin: 0 0 0.5rem;
}

/* ── Metrics row ─────────────────────────────────────────── */
.metrics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}
.metric-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  box-shadow: 0 2px 8px rgba(26,26,46,0.06);
}
.metric-icon {
  font-size: 1.5rem;
  color: var(--amber, #f5a623);
}
.metric-value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--navy, #16305a);
  line-height: 1;
}
.metric-label {
  font-size: 0.78rem;
  color: var(--muted, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-align: center;
}
</style>

