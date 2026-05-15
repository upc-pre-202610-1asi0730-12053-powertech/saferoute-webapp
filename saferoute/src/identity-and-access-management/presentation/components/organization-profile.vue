<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
  organization: { type: Object, required: true }
});
const emit = defineEmits(['edit-requested', 'suspend-requested']);

const { t } = useI18n();

const statusLabel = computed(() => {
  return props.organization?.status === 'ACTIVE'
      ? t('identity-and-access-management.organization.status.active')
      : t('identity-and-access-management.organization.status.suspended');
});

const isActive = computed(() => props.organization?.status === 'ACTIVE');

const formattedCreatedAt = computed(() => {
  if (!props.organization?.createdAt) return '—';
  try { return new Date(props.organization.createdAt).toLocaleDateString(); }
  catch { return props.organization.createdAt; }
});
</script>

<template>
  <pv-card class="org-profile">
    <template #title>{{ organization.name }}</template>
    <template #subtitle>
      <pv-tag :value="statusLabel" :severity="isActive ? 'success' : 'danger'"/>
    </template>
    <template #content>
      <div class="grid">
        <div class="col-12 md:col-6">
          <strong>{{ t('identity-and-access-management.organization.field.id') }}:</strong> {{ organization.id }}
        </div>
        <div class="col-12 md:col-6">
          <strong>{{ t('identity-and-access-management.organization.field.created-at') }}:</strong> {{ formattedCreatedAt }}
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2">
        <pv-button :label="t('identity-and-access-management.actions.edit')" icon="pi pi-pencil" @click="emit('edit-requested', organization)"/>
        <pv-button v-if="isActive"
                   :label="t('identity-and-access-management.actions.suspend')"
                   icon="pi pi-ban"
                   severity="danger"
                   @click="emit('suspend-requested', organization)"/>
      </div>
    </template>
  </pv-card>
</template>

<style scoped>
.org-profile { max-width: 640px; }
</style>
