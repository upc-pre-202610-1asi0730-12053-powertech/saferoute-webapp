<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useIamStore } from "../../application/iam.store.js";

const emit = defineEmits(['user-registered', 'registration-failed']);

const { t } = useI18n();
const store = useIamStore();

const firstName = ref('');
const lastName = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const roleTier = ref('PARENT');
const organizationId = ref('');
const errorMessage = ref('');

const roleOptions = [
  { label: 'identity-and-access-management.role.parent', value: 'PARENT' },
  { label: 'identity-and-access-management.role.driver', value: 'DRIVER' }
];

const passwordsMatch = computed(() => password.value === confirmPassword.value);

const submitRegister = async () => {
  errorMessage.value = '';
  if (!passwordsMatch.value) {
    errorMessage.value = t('identity-and-access-management.errors.password-mismatch');
    return;
  }
  const created = await store.registerUser({
    firstName: firstName.value,
    lastName: lastName.value,
    email: email.value,
    password: password.value,
    roleTier: roleTier.value,
    organizationId: organizationId.value || null
  });
  if (!created) {
    errorMessage.value = t('identity-and-access-management.errors.registration-failed');
    emit('registration-failed');
    return;
  }
  emit('user-registered', created);
};

const clearFields = () => {
  firstName.value = '';
  lastName.value = '';
  email.value = '';
  password.value = '';
  confirmPassword.value = '';
  roleTier.value = 'PARENT';
  organizationId.value = '';
  errorMessage.value = '';
};
</script>

<template>
  <form class="iam-form" @submit.prevent="submitRegister">
    <h2 class="subtitle">{{ t('identity-and-access-management.user-register.title') }}</h2><br>

    <div class="field mb-3">
      <label>{{ t('identity-and-access-management.user-register.role') }}</label>
      <pv-select-button v-model="roleTier"
                        :options="roleOptions"
                        option-label="label"
                        option-value="value"
                        :allow-empty="false">
        <template #option="slotProps">{{ t(slotProps.option.label) }}</template>
      </pv-select-button>
    </div>

    <div class="grid">
      <div class="col-12 md:col-6 field mb-3">
        <label for="ureg-first-name">{{ t('identity-and-access-management.fields.first-name') }}</label>
        <pv-input-text id="ureg-first-name" v-model="firstName" class="w-full" required/>
      </div>
      <div class="col-12 md:col-6 field mb-3">
        <label for="ureg-last-name">{{ t('identity-and-access-management.fields.last-name') }}</label>
        <pv-input-text id="ureg-last-name" v-model="lastName" class="w-full" required/>
      </div>
    </div>

    <div class="field mb-3">
      <label for="ureg-email">{{ t('identity-and-access-management.fields.email') }}</label>
      <pv-input-text id="ureg-email" v-model="email" type="email" class="w-full" required/>
    </div>

    <div class="field mb-3">
      <label for="ureg-org">{{ t('identity-and-access-management.fields.organization-id') }}</label>
      <pv-input-text id="ureg-org" v-model="organizationId" class="w-full"
                     :placeholder="t('identity-and-access-management.user-register.org-placeholder')"/>
      <small class="text-muted">{{ t('identity-and-access-management.user-register.org-help') }}</small>
    </div>

    <div class="field mb-3">
      <label for="ureg-password">{{ t('identity-and-access-management.fields.password') }}</label>
      <pv-input-text id="ureg-password" v-model="password" type="password" class="w-full" required/>
    </div>

    <div class="field mb-3">
      <label for="ureg-confirm">{{ t('identity-and-access-management.fields.confirm-password') }}</label>
      <pv-input-text id="ureg-confirm" v-model="confirmPassword" type="password" class="w-full" required/>
      <small v-if="confirmPassword && !passwordsMatch" class="text-red-500">
        {{ t('identity-and-access-management.errors.password-mismatch') }}
      </small>
    </div>

    <div class="flex gap-2">
      <pv-button :label="t('identity-and-access-management.actions.register')" icon="pi pi-user-plus" type="submit" :loading="store.loading"/>
      <pv-button :label="t('identity-and-access-management.actions.clear')" severity="secondary" type="button" @click="clearFields"/>
    </div>

    <p v-if="errorMessage" class="text-red-500 mt-3">{{ errorMessage }}</p>
  </form>
</template>

<style scoped>
.iam-form { max-width: 640px; }
.text-muted { color: #888888; }
.subtitle { color: #FFB74D}
</style>
