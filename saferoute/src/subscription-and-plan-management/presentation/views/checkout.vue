<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { SubscriptionApi } from "../../infrastructure/subscription-api.js";
import { useSubscriptionStore } from "../../application/subscription.store.js";

const route  = useRoute();
const router = useRouter();

const PAYPAL_CLIENT_ID = 'AdUsVXwA3QKQ_3UgFaH3wJZ6NgdzwL3PuEfi-um2YHyLAPiX7yRLMK2yJASwlT1i18KiD7RP30nwErH7';

// ── Params from URL ───────────────────────────────────────────────────────────
const planName  = route.query.plan   || '';
const planPrice = route.query.price  || '';
const orgId     = route.query.orgId  || null;
const planTier  = route.query.tier   || '';

// ── State ─────────────────────────────────────────────────────────────────────
const status   = ref('idle');   // 'idle' | 'success' | 'error' | 'cancelled'
const sdkReady = ref(false);
let   scriptEl = null;

// Seeded plan identifiers on the backend (fallback when the catalog has not loaded).
const TIER_TO_PLAN_ID = {
  BASIC:        'c0000000-0000-0000-0000-000000000001',
  INTERMEDIATE: 'c0000000-0000-0000-0000-000000000002',
  COMPLETE:     'c0000000-0000-0000-0000-000000000003',
};

const subscriptionApi = new SubscriptionApi();
const subscriptionStore = useSubscriptionStore();

function resolvePlanId() {
  const plan = subscriptionStore.plans.find(p => p.planTier === planTier);
  return plan?.id || TIER_TO_PLAN_ID[planTier] || planTier;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function numericPrice() {
  const raw   = String(planPrice).replace(',', '.');
  const match = raw.match(/(\d+\.?\d*)/);
  return match ? match[1] : '9.99';
}

function loadPaypalSdk() {
  return new Promise((resolve, reject) => {
    if (window.paypal) { resolve(); return; }
    const existing = document.getElementById('paypal-sdk-co');
    if (existing) { existing.addEventListener('load', resolve); return; }
    const s    = document.createElement('script');
    s.id       = 'paypal-sdk-co';
    s.src      = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture&components=buttons`;
    s.onload   = () => resolve();
    s.onerror  = () => reject(new Error('PayPal SDK failed to load'));
    document.head.appendChild(s);
    scriptEl = s;
  });
}

function renderButtons() {
  const amount = numericPrice();
  window.paypal.Buttons({
    style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 48 },

    createOrder(data, actions) {
      return actions.order.create({
        purchase_units: [{
          description: `SafeRoute — Plan ${planName}`,
          amount: { currency_code: 'USD', value: amount },
        }],
      });
    },

    async onApprove(data, actions) {
      await actions.order.capture();
      try {
        if (orgId) {
          const now = new Date();
          await subscriptionApi.createSubscription({
            organizationId: orgId,
            planId:    resolvePlanId(),
            planTier,
            state:     'ACTIVE',
            startDate: now.toISOString(),
            endDate:   new Date(now.getTime() + 30*24*60*60*1000).toISOString(),
          });
        }
      } catch (e) {
        console.warn('Subscription save error (payment was captured):', e);
      }
      status.value = 'success';
      setTimeout(() => router.push({ name: 'iam-sign-in' }), 2500);
    },

    onCancel() { status.value = 'cancelled'; },

    onError(err) {
      console.error('PayPal error', err);
      status.value = 'error';
    },
  }).render('#paypal-button-container');
}

onMounted(async () => {
  subscriptionStore.loadPlans().catch(() => {});
  try {
    await loadPaypalSdk();
    sdkReady.value = true;
    renderButtons();
  } catch (e) {
    console.error(e);
    status.value = 'error';
  }
});

onBeforeUnmount(() => {
  if (scriptEl && document.head.contains(scriptEl)) {
    document.head.removeChild(scriptEl);
  }
});

function goBack() { router.push({ name: 'iam-sign-in' }); }
</script>

<template>
  <div class="co-bg">
    <div class="co-wrap">

      <!-- Logo -->
      <div class="co-logo">
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
          <path d="M24 4L8 11V24C8 33.6 15.04 42.56 24 44C32.96 42.56 40 33.6 40 24V11L24 4Z" fill="#F59E0B"/>
        </svg>
        <span class="co-logo-name">SafeRoute</span>
      </div>

      <!-- Sandbox pill -->
      <div class="co-sandbox-pill">
        <span class="co-dot"/>
        Sandbox — entorno de prueba
      </div>

      <!-- Card -->
      <div class="co-card">
        <h1 class="co-title">Finaliza tu suscripción</h1>
        <p class="co-subtitle">Revisa tu plan y completa el pago de forma segura.</p>

        <!-- Order summary -->
        <div class="co-order">
          <div class="co-order-label">Resumen de orden</div>
          <div class="co-order-plan">{{ planName }}</div>
          <div v-if="planPrice" class="co-order-price">{{ planPrice }} / mes</div>
        </div>

        <hr class="co-divider"/>

        <!-- Success -->
        <div v-if="status === 'success'" class="co-msg co-msg-success">
          <span class="co-msg-icon">✅</span>
          <div>
            <strong>¡Pago realizado con éxito!</strong>
            <p>Redirigiendo a tu cuenta en unos segundos…</p>
          </div>
        </div>

        <!-- Cancelled -->
        <div v-if="status === 'cancelled'" class="co-msg co-msg-warn">
          <span class="co-msg-icon">⚠️</span>
          <div>
            <strong>Pago cancelado</strong>
            <p>Puedes intentarlo de nuevo cuando quieras.</p>
          </div>
        </div>

        <!-- Error -->
        <div v-if="status === 'error'" class="co-msg co-msg-error">
          <span class="co-msg-icon">❌</span>
          <div>
            <strong>Error al procesar el pago</strong>
            <p>Intenta nuevamente o elige otro método.</p>
          </div>
        </div>

        <!-- PayPal -->
        <template v-if="status === 'idle' || status === 'cancelled' || status === 'error'">
          <div class="co-pay-label">Pagar con PayPal</div>
          <div v-if="!sdkReady" class="co-spinner-wrap">
            <div class="co-spinner"/>
            Cargando opciones de pago…
          </div>
          <div id="paypal-button-container"/>
        </template>

        <div class="co-back-link">
          <button class="co-btn-link" @click="goBack">← Volver al inicio de sesión</button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.co-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f1b36 0%, #16305a 50%, #1a2a4a 100%);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 40px 16px 60px;
}
.co-wrap {
  display: flex; flex-direction: column; align-items: center;
  width: 100%; max-width: 480px;
}

/* Logo */
.co-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.co-logo-name { font-size: 1.5rem; font-weight: 800; color: #fff; letter-spacing: -0.4px; }

/* Sandbox pill */
.co-sandbox-pill {
  display: inline-flex; align-items: center; gap: 7px;
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18);
  border-radius: 20px; padding: 4px 14px;
  font-size: 0.78rem; color: #94a3b8; margin-bottom: 24px;
}
.co-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #F59E0B; animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }

/* Card */
.co-card {
  background: #fff; border-radius: 20px; padding: 36px; width: 100%;
  box-shadow: 0 24px 64px rgba(0,0,0,0.4);
}
.co-title    { font-size: 1.3rem; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
.co-subtitle { font-size: 0.875rem; color: #64748b; margin: 0 0 22px; }

/* Order summary */
.co-order {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 1.5px solid #F59E0B; border-radius: 12px;
  padding: 16px 20px; margin-bottom: 22px;
}
.co-order-label {
  font-size: 0.72rem; font-weight: 600; color: #92400e;
  text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;
}
.co-order-plan  { font-size: 1.35rem; font-weight: 800; color: #78350f; }
.co-order-price { font-size: 0.95rem; color: #92400e; margin-top: 2px; }

.co-divider { border: none; border-top: 1px solid #e2e8f0; margin: 0 0 20px; }

/* Pay label */
.co-pay-label { font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 12px; }

/* Spinner */
.co-spinner-wrap {
  display: flex; align-items: center; gap: 10px;
  color: #64748b; font-size: 0.85rem; padding: 10px 0 14px;
}
.co-spinner {
  width: 20px; height: 20px; border: 2px solid #e2e8f0;
  border-top-color: #F59E0B; border-radius: 50%;
  animation: spin 0.75s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Status messages */
.co-msg {
  display: flex; align-items: flex-start; gap: 12px;
  border-radius: 12px; padding: 14px 16px; margin-bottom: 18px; font-size: 0.875rem;
}
.co-msg strong { display: block; font-weight: 700; margin-bottom: 2px; }
.co-msg p      { margin: 0; opacity: 0.85; }
.co-msg-icon   { font-size: 1.3rem; flex-shrink: 0; }
.co-msg-success { background: #d1fae5; border: 1.5px solid #10b981; color: #065f46; }
.co-msg-warn    { background: #fef9c3; border: 1.5px solid #eab308; color: #713f12; }
.co-msg-error   { background: #fee2e2; border: 1.5px solid #ef4444; color: #991b1b; }

/* PayPal container */
#paypal-button-container { min-height: 50px; }

/* Back link */
.co-back-link { text-align: center; margin-top: 20px; }
.co-btn-link {
  background: none; border: none; color: #94a3b8;
  font-size: 0.82rem; cursor: pointer; padding: 4px 8px;
  transition: color .15s; font-family: inherit;
}
.co-btn-link:hover { color: #F59E0B; }
</style>
