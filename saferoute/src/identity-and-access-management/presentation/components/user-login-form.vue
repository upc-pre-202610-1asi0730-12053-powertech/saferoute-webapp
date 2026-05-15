<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useIamStore } from "../../application/iam.store.js";

const emit = defineEmits(['user-logged-in', 'login-failed']);
const { t } = useI18n();
const store = useIamStore();

const email = ref('');
const password = ref('');
const errorMessage = ref('');

const submitLogin = async () => {
  errorMessage.value = '';
  const user = await store.signIn(email.value, password.value);
  if (!user) {
    errorMessage.value = t('identity-and-access-management.errors.invalid-credentials');
    emit('login-failed');
    return;
  }
  // This form is for Parent/Driver only — admins must use the Admin tab.
  if (user.roleTier === 'ADMIN') {
    errorMessage.value = t('identity-and-access-management.errors.use-admin-tab');
    store.signOut();
    emit('login-failed');
    return;
  }
  emit('user-logged-in', user);
};

const clearFields = () => {
  email.value = '';
  password.value = '';
  errorMessage.value = '';
};
</script>

<template>
  <form class="iam-form" @submit.prevent="submitLogin">
    <h2>{{ t('identity-and-access-management.user-login.title') }}</h2>

    <div class="field mb-3">
      <label for="user-login-email">{{ t('identity-and-access-management.fields.email') }}</label>
      <pv-input-text id="user-login-email" v-model="email" type="email" class="w-full" required/>
    </div>

    <div class="field mb-3">
      <label for="user-login-password">{{ t('identity-and-access-management.fields.password') }}</label>
      <pv-input-text id="user-login-password" v-model="password" type="password" class="w-full" required/>
    </div>

    <div class="flex gap-2">
      <pv-button :label="t('identity-and-access-management.actions.sign-in')" icon="pi pi-sign-in" type="submit" :loading="store.loading"/>
      <pv-button :label="t('identity-and-access-management.actions.clear')" severity="secondary" type="button" @click="clearFields"/>
    </div>

    <p v-if="errorMessage" class="text-red-500 mt-3">{{ errorMessage }}</p>
  </form>
</template>

<style scoped>
.iam-form { max-width: 480px; }
</style>
