<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
  subscription: { type: Object, required: true },
  plan:         { type: Object, default: null }
});
const emit = defineEmits(['upgrade-requested', 'cancel-requested']);

const { t } = useI18n();

const statusLabel = computed(() => {
  switch (props.subscription?.state) {
    case 'ACTIVE':    return t('subscription-and-plan-management.status.active');
    case 'CANCELLED': return t('subscription-and-plan-management.status.cancelled');
    case 'EXPIRED':   return t('subscription-and-plan-management.status.expired');
    default:          return props.subscription?.state || '—';
  }
});

const statusSeverity = computed(() => {
  switch (props.subscription?.state) {
    case 'ACTIVE':    return 'success';
    case 'CANCELLED': return 'danger';
    case 'EXPIRED':   return 'warn';
    default:          return 'info';
  }
});

const isActive = computed(() => props.subscription?.state === 'ACTIVE');

const remainingDays = computed(() => {
  if (!props.subscription?.endDate) return null;
  const end = new Date(props.subscription.endDate).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
});

const formatDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
};
</script>

<template>
  <pv-card class="subscription-status">
    <template #title>
      {{ t('subscription-and-plan-management.status-card.title') }}
      <pv-tag :value="statusLabel" :severity="statusSeverity" class="ml-2"/>
    </template>
    <template #content>
      <div class="grid">
        <div class="col-12 md:col-6">
          <strong>{{ t('subscription-and-plan-management.status-card.plan') }}:</strong>
          {{ plan ? t(`subscription.plan-tier.${plan.planTier?.toLowerCase()}`) : '—' }}
        </div>
        <div class="col-12 md:col-6">
          <strong>{{ t('subscription-and-plan-management.status-card.price') }}:</strong>
          S/ {{ plan?.price ?? '—' }}
        </div>
        <div class="col-12 md:col-6">
          <strong>{{ t('subscription-and-plan-management.status-card.start-date') }}:</strong>
          {{ formatDate(subscription.startDate) }}
        </div>
        <div class="col-12 md:col-6">
          <strong>{{ t('subscription-and-plan-management.status-card.end-date') }}:</strong>
          {{ formatDate(subscription.endDate) }}
        </div>
        <div v-if="remainingDays !== null" class="col-12">
          <strong>{{ t('subscription-and-plan-management.status-card.remaining-days') }}:</strong>
          {{ remainingDays }}
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2">
        <pv-button v-if="isActive"
                   :label="t('subscription-and-plan-management.actions.upgrade')"
                   icon="pi pi-arrow-up"
                   @click="emit('upgrade-requested', subscription)"/>
        <pv-button v-if="isActive"
                   :label="t('subscription-and-plan-management.actions.cancel')"
                   icon="pi pi-times"
                   severity="danger"
                   @click="emit('cancel-requested', subscription)"/>
      </div>
    </template>
  </pv-card>
</template>

<style scoped>
.subscription-status { max-width: 720px; }
</style>
