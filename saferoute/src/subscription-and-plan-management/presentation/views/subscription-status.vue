<script setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { useSubscriptionStore } from "../../application/subscription.store.js";
import { useIamStore } from "../../../identity-and-access-management/application/iam.store.js";

const router            = useRouter();
const confirm           = useConfirm();
const toast             = useToast();
const subscriptionStore = useSubscriptionStore();
const iamStore          = useIamStore();

onMounted(async () => {
  if (!subscriptionStore.plansLoaded) await subscriptionStore.loadPlans();
  
  if (iamStore.currentUser?.organizationId)
    await subscriptionStore.loadSubscription(iamStore.currentUser.organizationId);
});

/* ── Helpers ──────────────────────────────────────────── */
const sub  = computed(() => subscriptionStore.subscription);
const plan = computed(() => subscriptionStore.currentPlan);

const tierName = (tier) => ({ BASIC: 'Básico', INTERMEDIATE: 'Intermedio', COMPLETE: 'Completo' }[tier] || tier || '—');

const statusInfo = computed(() => {
  switch (sub.value?.state) {
    case 'ACTIVE':    return { label: 'Activo',    severity: 'success', color: '#22c55e', bg: '#dcfce7' };
    case 'CANCELLED': return { label: 'Cancelado', severity: 'danger',  color: '#ef4444', bg: '#fee2e2' };
    case 'EXPIRED':   return { label: 'Expirado',  severity: 'warn',    color: '#f59e0b', bg: '#fef3c7' };
    default:          return { label: '—',         severity: 'info',    color: '#6b7280', bg: '#f3f4f6' };
  }
});

const remainingDays = computed(() => {
  if (!sub.value?.endDate) return null;
  const end = new Date(sub.value.endDate).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
});

const totalDays = computed(() => {
  if (!sub.value?.startDate || !sub.value?.endDate) return 30;
  return Math.max(1, Math.ceil((new Date(sub.value.endDate) - new Date(sub.value.startDate)) / 86400000));
});

const progressPct = computed(() => {
  if (remainingDays.value === null) return 0;
  return Math.round((remainingDays.value / totalDays.value) * 100);
});

const progressColor = computed(() => {
  const p = progressPct.value;
  if (p > 50) return 'var(--green)';
  if (p > 20) return 'var(--amber)';
  return '#ef4444';
});

const formatDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return iso; }
};

// Features per tier extracted from README user stories
const planFeatures = {
  BASIC: [
    '2 rutas activas', '2 conductores',
    'Registro de alumnos', 'Marcación de abordaje digital',
    'Inicio y cierre de trayecto', 'Reporte de incidencias',
    'Bitácora de viajes', 'Notificaciones de abordaje',
  ],
  INTERMEDIATE: [
    '6 rutas activas', '6 conductores',
    'Registro de alumnos', 'Marcación de abordaje digital',
    'Inicio y cierre de trayecto', 'Reporte de incidencias',
    'Bitácora de viajes', 'Alertas de proximidad (US19)',
    'Cámara en vivo del bus (US21)', 'Historial de asistencia (US22)',
  ],
  COMPLETE: [
    '20 rutas activas', '20 conductores',
    'Registro de alumnos', 'Marcación de abordaje digital',
    'Inicio y cierre de trayecto', 'Reporte de incidencias',
    'Bitácora de viajes', 'Alertas de proximidad (US19)',
    'Cámara en vivo del bus (US21)', 'Historial de asistencia (US22)',
    'GPS en tiempo real (US18)', 'Analítica de flota PDF (US7)',
    'Botón de pánico SOS (US13)',
  ],
};

const planColor = { BASIC: '#6b7280', INTERMEDIATE: 'var(--amber)', COMPLETE: 'var(--navy)' };
const planIcon  = { BASIC: 'pi pi-star', INTERMEDIATE: 'pi pi-star-fill', COMPLETE: 'pi pi-verified' };

const onCancel = () => {
  confirm.require({
    message: '¿Seguro que deseas cancelar tu suscripción? Perderás acceso al finalizar el período.',
    header: 'Cancelar Suscripción',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sí, cancelar',
    rejectLabel: 'No, mantener',
    accept: async () => {
      await subscriptionStore.cancelSubscription(sub.value.id);
      toast.add({ severity: 'info', summary: 'Suscripción cancelada', life: 3000 });
    }
  });
};
</script>

<template>
  <div class="sub-status-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Mi Suscripción</h1>
        <p class="page-sub">Gestiona tu plan y facturación</p>
      </div>
      <pv-button label="Ver Planes" icon="pi pi-list" outlined @click="router.push({ name: 'subscription-and-plan-management-plans' })"/>
    </div>

    <!-- Loading -->
    <div v-if="subscriptionStore.loading" class="loading-wrap">
      <i class="pi pi-spin pi-spinner" style="font-size:2rem; color:var(--amber)"/>
    </div>

    <!-- No subscription-and-plan-management -->
    <div v-else-if="!sub" class="empty-state">
      <div class="empty-icon"><i class="pi pi-credit-card"/></div>
      <h3>Sin suscripción activa</h3>
      <p>Elige un plan para empezar a digitalizar tu transporte escolar</p>
      <pv-button label="Ver Planes" icon="pi pi-bolt" @click="router.push({ name: 'subscription-and-plan-management-plans' })"/>
    </div>

    <!-- Active subscription-and-plan-management -->
    <div v-else class="sub-grid">

      <!-- LEFT: plan card -->
      <div class="plan-detail-card">
        <div class="plan-header-row">
          <div class="plan-icon-big"
               :style="{ background: `${planColor[plan?.planTier]}22`, color: planColor[plan?.planTier] }">
            <i :class="planIcon[plan?.planTier] || 'pi pi-star'"/>
          </div>
          <div>
            <h2 class="plan-name">Plan {{ tierName(plan?.planTier) }}</h2>
            <span class="status-pill" :style="{ background: statusInfo.bg, color: statusInfo.color }">
              <i class="pi pi-circle-fill" style="font-size:0.5rem"/> {{ statusInfo.label }}
            </span>
          </div>
        </div>

        <div class="price-row">
          <span class="price-big">S/ {{ plan?.price ?? '—' }}</span>
          <span class="price-per">/ mes</span>
        </div>

        <!-- Days remaining -->
        <div class="days-block">
          <div class="days-header">
            <span>Días restantes</span>
            <strong :style="{ color: progressColor }">{{ remainingDays ?? '—' }} días</strong>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${progressPct}%`, background: progressColor }"/>
          </div>
        </div>

        <!-- Dates -->
        <div class="dates-row">
          <div class="date-item">
            <span class="date-label"><i class="pi pi-calendar"/> Inicio</span>
            <span class="date-value">{{ formatDate(sub.startDate) }}</span>
          </div>
          <div class="date-item">
            <span class="date-label"><i class="pi pi-calendar-times"/> Vence</span>
            <span class="date-value">{{ formatDate(sub.endDate) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="card-actions">
          <pv-button
            label="Cambiar Plan"
            icon="pi pi-arrow-up"
            class="w-full"
            @click="router.push({ name: 'subscription-and-plan-management-plans' })"/>
          <pv-button
            v-if="sub.state === 'ACTIVE'"
            label="Cancelar Suscripción"
            icon="pi pi-times"
            severity="danger"
            outlined
            class="w-full"
            @click="onCancel"/>
        </div>
      </div>

      <!-- RIGHT: features + org info -->
      <div class="right-col">

        <!-- Features included -->
        <div class="features-card">
          <h4 class="card-title"><i class="pi pi-check-circle"/> Funcionalidades incluidas</h4>
          <div class="features-grid">
            <div
              v-for="f in planFeatures[plan?.planTier] || []"
              :key="f"
              class="feature-chip">
              <i class="pi pi-check"/> {{ f }}
            </div>
          </div>
        </div>

        <!-- Org info -->
        <div class="info-card">
          <h4 class="card-title"><i class="pi pi-building"/> Información de organización</h4>
          <div class="info-row">
            <span class="info-label">Organización</span>
            <span class="info-value">{{ iamStore.currentUser?.organizationId || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ID Suscripción</span>
            <span class="info-value mono">{{ sub.id }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Estado</span>
            <span class="info-value">
              <span class="status-pill" :style="{ background: statusInfo.bg, color: statusInfo.color }">
                {{ statusInfo.label }}
              </span>
            </span>
          </div>
        </div>

      </div>
    </div>

    <pv-confirm-dialog/>
  </div>
</template>

<style scoped>
.sub-status-page { padding: 1.75rem; background: var(--bg); min-height: 100vh; font-family: var(--sans); }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.75rem;
}
.page-title { font-family: var(--heading); font-size: 1.6rem; font-weight: 800; color: var(--dark); margin: 0 0 0.25rem; }
.page-sub   { font-family: var(--sans);    font-size: 0.875rem; color: var(--muted); margin: 0; }

/* Loading / empty */
.loading-wrap { text-align: center; padding: 4rem; }
.empty-state  {
  text-align: center; padding: 4rem 2rem;
  background: #fff; border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  max-width: 480px; margin: 0 auto;
}
.empty-icon { font-size: 3rem; color: var(--amber); margin-bottom: 1rem; }
.empty-state h3 { font-size: 1.25rem; font-weight: 700; color: var(--dark); margin: 0 0 0.5rem; }
.empty-state p  { color: var(--muted); margin-bottom: 1.5rem; }

/* Grid */
.sub-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 1.5rem;
  align-items: start;
}

/* Plan detail card */
.plan-detail-card {
  background: #fff; border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  padding: 1.75rem;
  display: flex; flex-direction: column; gap: 1.25rem;
}
.plan-header-row { display: flex; align-items: center; gap: 1rem; }
.plan-icon-big {
  width: 56px; height: 56px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.4rem; flex-shrink: 0;
}
.plan-name { font-family: var(--heading); font-size: 1.3rem; font-weight: 800; color: var(--dark); margin: 0 0 0.25rem; }

.status-pill {
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-size: 0.75rem; font-weight: 700;
  padding: 3px 10px; border-radius: 20px;
}

.price-row   { display: flex; align-items: baseline; gap: 0.2rem; }
.price-big   { font-family: var(--heading); font-size: 2.4rem; font-weight: 800; color: var(--dark); }
.price-per   { font-family: var(--sans);    font-size: 0.9rem;  color: var(--muted); }

/* Progress */
.days-block  { display: flex; flex-direction: column; gap: 0.5rem; }
.days-header { display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--dark); }
.progress-track {
  height: 10px; background: #f3f4f6; border-radius: 99px; overflow: hidden;
}
.progress-fill  { height: 100%; border-radius: 99px; transition: width 0.5s ease; }

/* Dates */
.dates-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.date-item  { background: #f9fafb; border-radius: 10px; padding: 0.75rem; }
.date-label { display: flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; color: var(--muted); font-weight: 600; text-transform: uppercase; margin-bottom: 0.25rem; }
.date-value { font-size: 0.85rem; font-weight: 600; color: var(--dark); }

.card-actions { display: flex; flex-direction: column; gap: 0.65rem; }

/* Right col */
.right-col { display: flex; flex-direction: column; gap: 1.25rem; }

.features-card,
.info-card {
  background: #fff; border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  padding: 1.5rem;
}
.card-title {
  font-size: 0.95rem; font-weight: 700; color: var(--dark);
  margin: 0 0 1rem; display: flex; align-items: center; gap: 0.4rem;
}

.features-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.feature-chip {
  display: flex; align-items: center; gap: 0.35rem;
  background: #f0fdf4; color: #15803d;
  font-size: 0.8rem; font-weight: 600;
  padding: 5px 12px; border-radius: 20px;
}
.feature-chip .pi { font-size: 0.7rem; }

.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.65rem 0; border-bottom: 1px solid #f3f4f6;
  font-size: 0.875rem;
}
.info-row:last-child { border-bottom: none; }
.info-label { color: var(--muted); }
.info-value { font-weight: 600; color: var(--dark); }
.mono       { font-family: monospace; font-size: 0.78rem; }
</style>
