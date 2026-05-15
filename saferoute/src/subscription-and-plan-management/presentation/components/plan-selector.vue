<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
  plans: { type: Array, default: () => [] },
  currentPlanId: { type: [String, Number], default: null }
});
const emit = defineEmits(['plan-selected']);

const { t } = useI18n();

const selectedPlan = ref(null);
const errorMessage = ref('');

const tierOrder = { BASIC: 1, INTERMEDIATE: 2, COMPLETE: 3 };
const sortedPlans = computed(() => {
  return [...props.plans].sort((a, b) => (tierOrder[a.planTier] || 99) - (tierOrder[b.planTier] || 99));
});

const selectPlan = (plan) => {
  selectedPlan.value = plan;
  errorMessage.value = '';
};

const confirmSelection = () => {
  if (!selectedPlan.value) {
    errorMessage.value = t('subscription-and-plan-management.errors.no-plan-selected');
    return;
  }
  emit('plan-selected', selectedPlan.value);
};

const clearSelection = () => {
  selectedPlan.value = null;
  errorMessage.value = '';
};

const tierLabel = (tier) => t(`subscription.plan-tier.${tier?.toLowerCase()}`);
</script>

<template>
  <div class="plan-selector">
    <div class="plans-grid">
      <pv-card v-for="plan in sortedPlans"
               :key="plan.id"
               class="plan-card"
               :class="{
                 selected: selectedPlan?.id === plan.id,
                 current: currentPlanId && plan.id === currentPlanId
               }"
               @click="selectPlan(plan)">
        <template #title>
          {{ tierLabel(plan.planTier) }}
          <pv-tag v-if="currentPlanId && plan.id === currentPlanId"
                  :value="t('subscription-and-plan-management.current')"
                  severity="info"
                  class="ml-2"/>
        </template>
        <template #subtitle>
          <span class="price">${{ plan.price }}</span>
          <span class="period">/ {{ t('subscription-and-plan-management.month') }}</span>
        </template>
        <template #content>
          <ul class="benefits">
            <li><i class="pi pi-check"/> {{ t('subscription-and-plan-management.benefits.routes', {n: plan.maxRoutes}) }}</li>
            <li><i class="pi pi-check"/> {{ t('subscription-and-plan-management.benefits.drivers', {n: plan.maxDrivers}) }}</li>
          </ul>
        </template>
      </pv-card>
    </div>

    <div class="actions mt-4">
      <pv-button :label="t('subscription-and-plan-management.actions.confirm')" icon="pi pi-check" @click="confirmSelection"/>
      <pv-button :label="t('subscription-and-plan-management.actions.clear')" severity="secondary" class="ml-2" @click="clearSelection"/>
    </div>

    <p v-if="errorMessage" class="text-red-500 mt-3">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
.plan-card { cursor: pointer; transition: transform .15s, box-shadow .15s; border: 2px solid transparent; }
.plan-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.08); }
.plan-card.selected { border-color: #1976d2; }
.plan-card.current  { background: #f5faff; }
.price { font-size: 1.6rem; font-weight: 700; }
.period { color: #888; margin-left: .25rem; }
.benefits { list-style: none; padding: 0; }
.benefits li { padding: .25rem 0; }
.benefits i { color: #2e7d32; margin-right: .5rem; }
</style>
