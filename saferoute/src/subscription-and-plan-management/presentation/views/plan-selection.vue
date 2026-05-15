<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { useSubscriptionStore } from "../../application/subscription.store.js";
import { useIamStore } from "../../../identity-and-access-management/application/iam.store.js";

const router            = useRouter();
const toast             = useToast();
const subscriptionStore = useSubscriptionStore();
const iamStore          = useIamStore();

const billing = ref('monthly');
const busy    = ref(false);

// ── Navigate to dedicated checkout page ───────────────────────────────────────
function openPaypal(plan) {
  if (plan.id === currentPlanId.value) return;
  const credit    = priceAfterCredit(plan);
  const finalPrice = credit !== null ? credit : displayPrice(plan);
  router.push({
    name: 'subscription-and-plan-management-checkout',
    query: {
      plan:   meta(plan).name,
      price:  `$${finalPrice}`,
      tier:   plan.planTier,
      orgId:  iamStore.currentUser?.organizationId,
      credit: credit !== null ? proratedCredit.value : undefined,
    },
  });
}

onMounted(async () => {
  if (!subscriptionStore.plansLoaded) await subscriptionStore.loadPlans();
  if (iamStore.currentUser?.organizationId && !subscriptionStore.subscriptionLoaded)
    await subscriptionStore.loadSubscription(iamStore.currentUser.organizationId);
});

/* ─── Plan metadata (from README user stories & hypotheses) ─────────── */
const planMeta = {
  BASIC: {
    name:    'Básico',
    desc:    'Ideal para grupos pequeños de padres organizados',
    icon:    'pi pi-shield',
    color:   '#64748b',
    badge:   null,
    monthly: 9.99,
    features: [
      { text: 'Hasta 2 rutas activas',           ok: true  },
      { text: 'Hasta 2 conductores',              ok: true  },
      { text: 'Registro de alumnos',              ok: true  },
      { text: 'Marcación de abordaje digital',    ok: true  },
      { text: 'Inicio y cierre de trayecto',      ok: true  },
      { text: 'Reporte de incidencias',           ok: true  },
      { text: 'Bitácora de viajes',               ok: true  },
      { text: 'Notificaciones de abordaje',       ok: true  },
      { text: 'Alertas de proximidad',            ok: false },
      { text: 'Cámara en vivo del bus',           ok: false },
      { text: 'Historial de asistencia mensual',  ok: false },
      { text: 'GPS en tiempo real',               ok: false },
      { text: 'Analítica de flota (PDF)',         ok: false },
      { text: 'Botón de pánico SOS',              ok: false },
    ]
  },
  INTERMEDIATE: {
    name:    'Intermedio',
    desc:    'Para flotas medianas que buscan mayor visibilidad',
    icon:    'pi pi-star-fill',
    color:   '#F5A623',
    badge:   'Más Popular',
    monthly: 24.99,
    features: [
      { text: 'Hasta 6 rutas activas',            ok: true  },
      { text: 'Hasta 6 conductores',              ok: true  },
      { text: 'Registro de alumnos',              ok: true  },
      { text: 'Marcación de abordaje digital',    ok: true  },
      { text: 'Inicio y cierre de trayecto',      ok: true  },
      { text: 'Reporte de incidencias',           ok: true  },
      { text: 'Bitácora de viajes',               ok: true  },
      { text: 'Notificaciones de abordaje',       ok: true  },
      { text: 'Alertas de proximidad (US19)',     ok: true  },
      { text: 'Cámara en vivo del bus (US21)',    ok: true  },
      { text: 'Historial de asistencia (US22)',   ok: true  },
      { text: 'GPS en tiempo real',               ok: false },
      { text: 'Analítica de flota (PDF)',         ok: false },
      { text: 'Botón de pánico SOS',              ok: false },
    ]
  },
  COMPLETE: {
    name:    'Completo',
    desc:    'Solución total para empresas de transporte escolar',
    icon:    'pi pi-verified',
    color:   '#16305a',
    badge:   'Todo incluido',
    monthly: 49.99,
    features: [
      { text: 'Hasta 20 rutas activas',           ok: true  },
      { text: 'Hasta 20 conductores',             ok: true  },
      { text: 'Registro de alumnos',              ok: true  },
      { text: 'Marcación de abordaje digital',    ok: true  },
      { text: 'Inicio y cierre de trayecto',      ok: true  },
      { text: 'Reporte de incidencias',           ok: true  },
      { text: 'Bitácora de viajes',               ok: true  },
      { text: 'Notificaciones de abordaje',       ok: true  },
      { text: 'Alertas de proximidad (US19)',     ok: true  },
      { text: 'Cámara en vivo del bus (US21)',    ok: true  },
      { text: 'Historial de asistencia (US22)',   ok: true  },
      { text: 'GPS en tiempo real (US18/US45)',   ok: true  },
      { text: 'Analítica de flota PDF (US7)',     ok: true  },
      { text: 'Botón de pánico SOS (US13)',       ok: true  },
    ]
  }
};

const tierOrder = { BASIC: 1, INTERMEDIATE: 2, COMPLETE: 3 };
const sortedPlans = computed(() =>
  [...subscriptionStore.plans].sort((a, b) => (tierOrder[a.planTier]||99) - (tierOrder[b.planTier]||99))
);

const displayPrice = (plan) => {
  const base = planMeta[plan.planTier]?.monthly ?? plan.price;
  return billing.value === 'annual' ? Math.round(base * 0.8) : base;
};

const annualTotal = (plan) => {
  const base = planMeta[plan.planTier]?.monthly ?? plan.price;
  return Math.round(base * 12 * 0.8);
};

const currentPlanId = computed(() => subscriptionStore.subscription?.planId);

const meta = (plan) => planMeta[plan.planTier] || {};

// ── US-1.S2 Proration ─────────────────────────────────────────────────────
/** Days remaining on the active subscription (0 if none / expired) */
const remainingDays = computed(() => {
  const sub = subscriptionStore.subscription;
  if (!sub?.endDate) return 0;
  return Math.max(0, Math.ceil((new Date(sub.endDate) - Date.now()) / 86400000));
});

const totalDays = computed(() => {
  const sub = subscriptionStore.subscription;
  if (!sub?.startDate || !sub?.endDate) return 30;
  return Math.max(1, Math.ceil((new Date(sub.endDate) - new Date(sub.startDate)) / 86400000));
});

/** Credit in the billing currency based on unused portion of current plan */
const proratedCredit = computed(() => {
  if (!remainingDays.value || !subscriptionStore.currentPlan) return 0;
  const currentPrice = subscriptionStore.currentPlan.price ?? 0;
  return parseFloat(((remainingDays.value / totalDays.value) * currentPrice).toFixed(2));
});

/** Returns the price after applying prorated credit (only for upgrades) */
const priceAfterCredit = (plan) => {
  const base = displayPrice(plan);
  const currentTier = tierOrder[subscriptionStore.currentPlan?.planTier] || 0;
  const newTier     = tierOrder[plan.planTier] || 0;
  if (newTier <= currentTier || !proratedCredit.value) return null; // not an upgrade
  return Math.max(0, base - proratedCredit.value).toFixed(2);
};

const hire = async (plan) => {
  if (!iamStore.currentUser?.organizationId) {
    toast.add({ severity: 'warn', summary: 'Sin organización', detail: 'Necesitas pertenecer a una organización para contratar un plan.', life: 4000 });
    return;
  }
  busy.value = true;
  try {
    if (subscriptionStore.subscription) {
      await subscriptionStore.upgradeSubscription(subscriptionStore.subscription.id, plan.id);
      toast.add({ severity: 'success', summary: '¡Plan actualizado!', detail: `Ahora estás en el plan ${meta(plan).name}.`, life: 3000 });
    } else {
      await subscriptionStore.createSubscription({ organizationId: iamStore.currentUser.organizationId, planId: plan.id });
      toast.add({ severity: 'success', summary: '¡Suscripción activada!', detail: `Plan ${meta(plan).name} activo.`, life: 3000 });
    }
    router.push({ name: 'subscription-and-plan-management-status' });
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <div class="pricing-page">

    <!-- ── Header ────────────────────────────────────────── -->
    <div class="pricing-header">
      <p class="pricing-eyebrow">Planes y precios</p>
      <h1 class="pricing-title">Elige el plan ideal<br>para tu operación</h1>
      <p class="pricing-sub">
        Digitaliza tu transporte escolar. Sin costos ocultos. Cancela cuando quieras.
      </p>

      <!-- Billing toggle -->
      <div class="billing-toggle">
        <button class="tgl-btn" :class="{ active: billing === 'monthly' }" @click="billing = 'monthly'">
          Mensual
        </button>
        <button class="tgl-btn" :class="{ active: billing === 'annual' }" @click="billing = 'annual'">
          Anual
          <span class="off-chip">−20%</span>
        </button>
      </div>
    </div>

    <!-- ── Loading ───────────────────────────────────────── -->
    <div v-if="subscriptionStore.loading" class="spinner-wrap">
      <i class="pi pi-spin pi-spinner"/>
    </div>

    <!-- ── Plans ─────────────────────────────────────────── -->
    <div v-else class="plans-row">
      <div
        v-for="plan in sortedPlans"
        :key="plan.id"
        class="plan-card"
        :class="{
          popular: plan.planTier === 'INTERMEDIATE',
          current: plan.id === currentPlanId,
        }">

        <!-- badges -->
        <div v-if="meta(plan).badge" class="top-badge"
             :style="plan.planTier === 'INTERMEDIATE'
               ? 'background:var(--amber);color:var(--dark)'
               : 'background:var(--navy);color:#fff'">
          {{ meta(plan).badge }}
        </div>
        <div v-if="plan.id === currentPlanId" class="current-chip">
          <i class="pi pi-check-circle"/> Plan Actual
        </div>

        <!-- plan top -->
        <div class="plan-head">
          <div class="plan-icon" :style="{ background: meta(plan).color + '18', color: meta(plan).color }">
            <i :class="meta(plan).icon"/>
          </div>
          <div>
            <h3 class="plan-name">{{ meta(plan).name }}</h3>
            <p class="plan-desc">{{ meta(plan).desc }}</p>
          </div>
        </div>

        <!-- price -->
        <div class="plan-price-block">
          <div class="plan-price">
            <span class="currency">$</span>
            <span class="amount" :class="{ 'price-strike': priceAfterCredit(plan) !== null }">
              {{ displayPrice(plan) }}
            </span>
            <span v-if="priceAfterCredit(plan) !== null" class="amount amount-prorated">
              {{ priceAfterCredit(plan) }}
            </span>
            <span class="per">/ mes</span>
          </div>
          <div v-if="priceAfterCredit(plan) !== null" class="proration-chip">
            <i class="pi pi-tag"/> Crédito aplicado: −${{ proratedCredit }}
            <span class="proration-days">({{ remainingDays }} días restantes)</span>
          </div>
          <p v-else-if="billing === 'annual'" class="annual-hint">
            ${{ annualTotal(plan) }} al año · 2 meses gratis
          </p>
          <p v-else class="annual-hint">
            o S/ {{ annualTotal(plan) }} al año con 20% off
          </p>
        </div>

        <div class="divider"/>

        <!-- features -->
        <ul class="feat-list">
          <li
            v-for="f in meta(plan).features"
            :key="f.text"
            class="feat-item"
            :class="{ locked: !f.ok }">
            <span class="feat-icon">
              <i :class="f.ok ? 'pi pi-check' : 'pi pi-times'"/>
            </span>
            {{ f.text }}
          </li>
        </ul>

        <!-- CTA -->
        <pv-button
          :label="plan.id === currentPlanId ? 'Plan Actual' : 'Contratar ahora'"
          :icon="plan.id === currentPlanId ? 'pi pi-check' : 'pi pi-paypal'"
          :disabled="plan.id === currentPlanId || busy"
          :loading="busy"
          class="cta-btn w-full"
          :class="{ 'cta-popular': plan.planTier === 'INTERMEDIATE' }"
          @click="openPaypal(plan)"/>
      </div>
    </div>

    <!-- ── Footer note ───────────────────────────────────── -->
    <p class="pricing-note">
      <i class="pi pi-lock"/> Pago seguro &nbsp;·&nbsp; Cancela en cualquier momento &nbsp;·&nbsp; Precios en USD ($)
    </p>

  </div>
</template>

<style scoped>
/* ─── Page ─────────────────────────────────────────────── */
.pricing-page {
  padding: 2.5rem 2rem;
  background: var(--bg);
  min-height: 100vh;
  font-family: var(--sans);
}

/* ─── Header ────────────────────────────────────────────── */
.pricing-header { text-align: center; margin-bottom: 3rem; }

.pricing-eyebrow {
  font-family: var(--sans);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--amber);
  margin: 0 0 0.5rem;
}
.pricing-title {
  font-family: var(--heading);
  font-size: 2.4rem;
  font-weight: 800;
  color: var(--dark);
  line-height: 1.2;
  margin: 0 0 0.75rem;
}
.pricing-sub {
  font-family: var(--sans);
  font-size: 1rem;
  color: var(--muted);
  margin: 0 0 1.75rem;
}

/* Billing toggle */
.billing-toggle {
  display: inline-flex;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}
.tgl-btn {
  padding: 0.5rem 1.25rem;
  border: none;
  background: none;
  border-radius: 8px;
  font-family: var(--sans);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.15s;
}
.tgl-btn.active { background: var(--navy); color: #fff; }
.off-chip {
  background: #d1fae5;
  color: #065f46;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 20px;
}

/* ─── Plans row ─────────────────────────────────────────── */
.plans-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  max-width: 1060px;
  margin: 0 auto;
}

/* ─── Plan card ─────────────────────────────────────────── */
.plan-card {
  position: relative;
  background: #fff;
  border-radius: 20px;
  border: 2px solid #e5e7eb;
  padding: 2rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
}
.plan-card:hover { transform: translateY(-5px); box-shadow: 0 12px 40px rgba(0,0,0,0.1); }
.plan-card.popular { border-color: var(--amber); box-shadow: 0 4px 24px rgba(245,166,35,0.2); }
.plan-card.current { border-color: var(--navy); }

/* badges */
.top-badge {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 800;
  padding: 4px 14px;
  border-radius: 99px;
  white-space: nowrap;
  letter-spacing: 0.03em;
}
.current-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  align-self: flex-start;
  background: #dbeafe;
  color: #1d4ed8;
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 99px;
}

/* plan head */
.plan-head { display: flex; gap: 0.9rem; align-items: flex-start; }
.plan-icon {
  width: 46px; height: 46px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; flex-shrink: 0;
}
.plan-name {
  font-family: var(--heading);
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--dark);
  margin: 0 0 0.2rem;
}
.plan-desc {
  font-family: var(--sans);
  font-size: 0.78rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.4;
}

/* price */
.plan-price-block { display: flex; flex-direction: column; gap: 0.2rem; }
.plan-price { display: flex; align-items: baseline; gap: 0.15rem; }
.currency { font-family: var(--heading); font-size: 1rem; font-weight: 700; color: var(--dark); }
.amount          { font-family: var(--heading); font-size: 3rem; font-weight: 800; color: var(--dark); line-height: 1; }
.amount.price-strike  { font-size: 1.6rem; text-decoration: line-through; color: var(--muted); }
.amount.amount-prorated { font-size: 3rem; color: #16a34a; margin-left: 0.2rem; }
.per      { font-family: var(--sans); font-size: 0.85rem; color: var(--muted); margin-left: 0.2rem; }
.annual-hint { font-family: var(--sans); font-size: 0.75rem; color: var(--muted); margin: 0; }
.proration-chip {
  display: inline-flex; align-items: center; gap: 0.3rem; flex-wrap: wrap;
  background: #dcfce7; border: 1px solid #86efac; border-radius: 8px;
  padding: 3px 9px; font-size: 0.72rem; font-weight: 700; color: #15803d; margin-top: 4px;
}
.proration-days { font-weight: 400; color: #16a34a; }

.divider { border: none; border-top: 1px solid #f1f5f9; margin: 0; }

/* features */
.feat-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 0.6rem;
  flex: 1;
}
.feat-item {
  display: flex; align-items: center; gap: 0.55rem;
  font-family: var(--sans);
  font-size: 0.855rem;
  color: var(--dark);
}
.feat-item.locked { color: #cbd5e1; }

.feat-icon {
  width: 18px; height: 18px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.feat-item:not(.locked) .feat-icon { color: var(--green); }
.feat-item.locked        .feat-icon { color: #cbd5e1; }
.feat-icon .pi { font-size: 0.78rem; }

/* CTA */
.cta-btn { margin-top: auto; font-family: var(--sans); font-weight: 700; }
:deep(.cta-popular .p-button) {
  background: var(--amber) !important;
  border-color: var(--amber) !important;
  color: var(--dark) !important;
  font-weight: 700;
}

/* ─── Misc ──────────────────────────────────────────────── */
.spinner-wrap { text-align: center; padding: 5rem; font-size: 2rem; color: var(--amber); }

.pricing-note {
  text-align: center;
  font-family: var(--sans);
  font-size: 0.78rem;
  color: var(--muted);
  margin-top: 2.5rem;
  display: flex; align-items: center; justify-content: center; gap: 0.4rem;
}

</style>
