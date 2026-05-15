<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useIamStore } from "../../application/iam.store.js";

const props = defineProps({
  initialOrganization: { type: Object, default: null }
});
const emit = defineEmits(['organization-created', 'organization-updated']);

const { t } = useI18n();
const store = useIamStore();

const name = ref('');
const errorMessage = ref('');

watch(() => props.initialOrganization, (org) => {
  name.value = org?.name || '';
}, { immediate: true });

const submitOrganization = async () => {
  errorMessage.value = '';
  if (props.initialOrganization?.id) {
    
    emit('organization-updated', { ...props.initialOrganization, name: name.value });
    return;
  }
  const created = await store.createOrganization({ name: name.value });
  if (!created) {
    errorMessage.value = t('identity-and-access-management.errors.organization-create-failed');
    return;
  }
  emit('organization-created', created);
};

const clearFields = () => {
  name.value = '';
  errorMessage.value = '';
};
</script>

<template>
  <form class="iam-form" @submit.prevent="submitOrganization">
    <h2>{{ initialOrganization?.id ? t('identity-and-access-management.organization-form.title-edit') : t('identity-and-access-management.organization-form.title-new') }}</h2>

    <div class="field mb-3">
      <label for="org-name">{{ t('identity-and-access-management.fields.organization-name') }}</label>
      <pv-input-text id="org-name" v-model="name" class="w-full" required/>
    </div>

    <div class="flex gap-2">
      <pv-button :label="t('identity-and-access-management.actions.save')" icon="pi pi-save" type="submit" :loading="store.loading"/>
      <pv-button :label="t('identity-and-access-management.actions.clear')" severity="secondary" type="button" @click="clearFields"/>
    </div>

    <p v-if="errorMessage" class="text-red-500 mt-3">{{ errorMessage }}</p>
  </form>
</template>

<style scoped>
.iam-form { max-width: 480px; }
</style>
