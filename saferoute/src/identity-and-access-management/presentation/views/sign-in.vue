<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useIamStore } from "../../application/iam.store.js";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const store = useIamStore();

const mode = ref('user');
const modeOptions = [
  { label: 'identity-and-access-management.sign-in.mode.user',  value: 'user',  icon: 'pi pi-users' },
  { label: 'identity-and-access-management.sign-in.mode.admin', value: 'admin', icon: 'pi pi-shield' }
];

const email = ref('');
const password = ref('');
const errorMessage = ref('');

const submit = async () => {
  errorMessage.value = '';
  const user = await store.signIn(email.value, password.value);
  if (!user) {
    errorMessage.value = t('identity-and-access-management.errors.invalid-credentials');
    return;
  }
  if (mode.value === 'user' && user.roleTier === 'ADMIN') {
    errorMessage.value = t('identity-and-access-management.errors.use-admin-tab');
    store.signOut();
    return;
  }
  if (mode.value === 'admin' && user.roleTier !== 'ADMIN') {
    errorMessage.value = t('identity-and-access-management.errors.not-admin');
    store.signOut();
    return;
  }
  const redirect = route.query.redirect;
  router.push(redirect && typeof redirect === 'string' ? redirect : { name: 'home' });
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">
        <i class="pi pi-shield" style="font-size: 3rem; color: var(--amber)"/>
        <h1 class="brand-name">SafeRoute</h1>
      </div>

      <h2 class="form-title">{{ t('identity-and-access-management.sign-in.title') }}</h2>

      <pv-select-button v-model="mode"
                        :options="modeOptions"
                        option-label="label"
                        option-value="value"
                        :allow-empty="false"
                        class="mode-switch mb-4">
        <template #option="slotProps">
          <i :class="slotProps.option.icon" class="mr-2"/>
          {{ t(slotProps.option.label) }}
        </template>
      </pv-select-button>

      <form @submit.prevent="submit">
        <div class="field mb-3">
          <label for="si-email">{{ t('identity-and-access-management.fields.email') }}</label>
          <pv-input-text id="si-email" v-model="email" type="email" class="w-full" required autocomplete="email"/>
        </div>

        <div class="field mb-3">
          <label for="si-password">{{ t('identity-and-access-management.fields.password') }}</label>
          <pv-input-text id="si-password" v-model="password" type="password" class="w-full" required autocomplete="current-password"/>
        </div>

        <p v-if="errorMessage" class="error-msg mb-3">{{ errorMessage }}</p>

        <pv-button :label="t('identity-and-access-management.actions.sign-in')" icon="pi pi-sign-in" type="submit" :loading="store.loading" class="w-full"/>
      </form>

      <div class="auth-footer mt-4">
        <span>{{ t('identity-and-access-management.sign-in.no-account') }}</span>
        <pv-button :label="t('identity-and-access-management.actions.register')" link @click="router.push({name: 'identity-and-access-management-sign-up'})"/>
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
}
.auth-card {
  background: var(--card);
  border-radius: 14px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.3);
}
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
  margin-bottom: 1.25rem;
}
.mode-switch { width: 100%; }
.mode-switch :deep(.p-selectbutton) { width: 100%; display: flex; }
.mode-switch :deep(.p-togglebutton) { flex: 1; justify-content: center; }
.field label {
  display: block;
  margin-bottom: 0.35rem;
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--dark);
}
.error-msg { color: #e53935; font-size: 0.875rem; }

:deep(.p-button:not(.p-button-link)) {
  background: var(--amber);
  border-color: var(--amber);
  color: var(--dark);
}
:deep(.p-button:not(.p-button-link):hover) {
  background: #ffa726;
  border-color: #ffa726;
}
.auth-footer {
  text-align: center;
  font-size: 0.875rem;
  color: var(--muted);
}
</style>
