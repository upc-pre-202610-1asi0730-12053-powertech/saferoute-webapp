<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useIamStore } from "../../application/iam.store.js";

const props = defineProps({
  organizationId: { type: [String, Number], default: null }
});
const emit = defineEmits(['admin-registered', 'registration-failed']);

const { t } = useI18n();
const store = useIamStore();

const firstName = ref('');
const lastName = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');

const passwordsMatch = computed(() => password.value === confirmPassword.value);

const submitRegister = async () => {
  errorMessage.value = '';
  if (!passwordsMatch.value) {
    errorMessage.value = t('identity-and-access-management.errors.password-mismatch');
    return;
  }
  const created = await store.registerAdmin({
    firstName: firstName.value,
    lastName: lastName.value,
    email: email.value,
    password: password.value,
    organizationId: props.organizationId
  });
  if (!created) {
    errorMessage.value = t('identity-and-access-management.errors.registration-failed');
    emit('registration-failed');
    return;
  }
  emit('admin-registered', created);
};

const clearFields = () => {
  firstName.value = '';
  lastName.value = '';
  email.value = '';
  password.value = '';
  confirmPassword.value = '';
  errorMessage.value = '';
};
</script>

<template>
  <form class="iam-form" @submit.prevent="submitRegister">
    <h2>{{ t('identity-and-access-management.admin-register.title') }}</h2>

    <div class="grid">
      <div class="col-12 md:col-6 field mb-3">
        <label for="reg-first-name">{{ t('identity-and-access-management.fields.first-name') }}</label>
        <pv-input-text id="reg-first-name" v-model="firstName" class="w-full" required/>
      </div>
      <div class="col-12 md:col-6 field mb-3">
        <label for="reg-last-name">{{ t('identity-and-access-management.fields.last-name') }}</label>
        <pv-input-text id="reg-last-name" v-model="lastName" class="w-full" required/>
      </div>
    </div>

    <div class="field mb-3">
      <label for="reg-email">{{ t('identity-and-access-management.fields.email') }}</label>
      <pv-input-text id="reg-email" v-model="email" type="email" class="w-full" required/>
    </div>

    <div class="field mb-3">
      <label for="reg-password">{{ t('identity-and-access-management.fields.password') }}</label>
      <pv-input-text id="reg-password" v-model="password" type="password" class="w-full" required/>
    </div>

    <div class="field mb-3">
      <label for="reg-confirm">{{ t('identity-and-access-management.fields.confirm-password') }}</label>
      <pv-input-text id="reg-confirm" v-model="confirmPassword" type="password" class="w-full" required/>
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
</style>
