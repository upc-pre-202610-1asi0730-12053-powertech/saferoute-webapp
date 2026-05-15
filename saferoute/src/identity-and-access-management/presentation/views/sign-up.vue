<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import OrganizationForm from "../components/organization-form.vue";
import AdminRegisterForm from "../components/admin-register-form.vue";
import UserRegisterForm from "../components/user-register-form.vue";

const { t } = useI18n();
const router = useRouter();
const route  = useRoute();

// Registration is always admin-only (drivers/parents are added by the admin)
const mode = ref('admin');

// Plan banner: populated when arriving from the landing with plan query params
const selectedPlan = computed(() => {
  const { planName, planPrice } = route.query;
  if (planName && planPrice) return { name: planName, price: planPrice };
  return null;
});

const adminStep = ref(1);
const createdOrganization = ref(null);

const onOrganizationCreated = (org) => {
  createdOrganization.value = org;
  adminStep.value = 2;
};

const onRegistered = (registeredOrgId) => {
  const { planTier, planName, planPrice } = route.query;
  if (planTier && registeredOrgId) {
    
    router.push({
      name: 'subscription-and-plan-management-checkout',
      query: {
        plan:   planName,
        price:  planPrice,
        tier:   planTier,
        orgId:  registeredOrgId,
      },
    });
  } else {
    router.push({ name: 'iam-sign-in' });
  }
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-card wide">
      <div class="auth-logo">
        <i class="pi pi-shield" style="font-size: 3rem; color: var(--amber)"/>
        <h1 class="brand-name">SafeRoute</h1>
      </div>

      <h2 class="form-title">{{ t('identity-and-access-management.sign-up.title') }}</h2>

      <!-- Plan banner (shown when arriving from landing plan selection) -->
      <div v-if="selectedPlan" class="plan-banner">
        <i class="pi pi-shield plan-banner-icon"/>
        Plan seleccionado:
        <strong>{{ selectedPlan.name }} — {{ selectedPlan.price }}</strong>
      </div>

      <template v-if="mode === 'admin'">
        <div class="steps mb-4">
          <span :class="['step', { active: adminStep === 1, done: adminStep > 1 }]">
            <i class="pi pi-building mr-1"/>{{ t('identity-and-access-management.sign-up.step-organization') }}
          </span>
          <i class="pi pi-arrow-right mx-2" style="color:#aaa"/>
          <span :class="['step', { active: adminStep === 2 }]">
            <i class="pi pi-user mr-1"/>{{ t('identity-and-access-management.sign-up.step-admin') }}
          </span>
        </div>
        <organization-form v-if="adminStep === 1" @organization-created="onOrganizationCreated"/>
        <admin-register-form v-else :organization-id="createdOrganization?.id" @admin-registered="onRegistered(createdOrganization?.id)"/>
      </template>

      <div class="auth-footer mt-4">
        <span>{{ t('identity-and-access-management.sign-up.have-account') }}</span>
        <pv-button :label="t('identity-and-access-management.actions.sign-in')" link @click="router.push({name: 'iam-sign-in'})"/>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--dark) 0%, var(--navy) 100%);
  padding: 2rem 1rem;
}
.auth-card {
  background: var(--card);
  border-radius: 14px;
  padding: 2.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.3);
}
.auth-card.wide { max-width: 600px; }
.auth-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.25rem;
}
.brand-name {
  margin: 0.5rem 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--dark);
}
.form-title {
  text-align: center;
  font-size: 1rem;
  font-weight: 500;
  color: var(--muted);
  margin-bottom: 1.5rem;
}
.mode-switch { width: 100%; }
.steps {
  display: flex;
  align-items: center;
}
.step { color: var(--muted); font-size: 0.9rem; }
.step.active { color: var(--navy); font-weight: 600; }
.step.done { color: var(--green); }
.auth-footer {
  text-align: center;
  font-size: 0.875rem;
  color: var(--muted);
}

/* Plan banner */
.plan-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fffbeb;
  border: 1.5px solid #f5a623;
  border-radius: 9px;
  padding: 0.6rem 1rem;
  font-size: 0.875rem;
  color: #7c5700;
  margin-bottom: 1.25rem;
}
.plan-banner-icon {
  color: #f5a623;
  font-size: 1rem;
  flex-shrink: 0;
}
.plan-banner strong {
  color: #1a1a2e;
}
</style>
