<script setup>
import {useI18n} from "vue-i18n";
import {useRouter} from "vue-router";
import {useConfirm} from "primevue";
import {useSubscriptionStore} from "../../application/subscription.store.js";
import {onMounted, toRefs} from "vue";

const {t} = useI18n();
const router = useRouter();
const confirm = useConfirm();
const store = useSubscriptionStore();
const {plans, errors, loaded} = toRefs(store);

onMounted(() => {
  if (!store.loaded) {
    store.fetchPlans();
  }
});

const confirmDelete = (plan) => {
  confirm.require({
    message: `Are you sure you want to delete ${plan.name}?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      store.deletePlan(plan);
    },
  });
};
</script>

<template>
  <div class="p-4">
    <h1>Plans</h1>
    <pv-button label="New Plan" class="mb-3" icon="pi pi-plus" @click="router.push({name: 'subscription-and-plan-management-plan-new'})"/>
    <pv-data-table
        :loading="!loaded"
        :rows="5"
        :rows-per-page-options="[5, 10, 20]"
        :value="plans"
        paginator
        striped-rows
        table-style="min-width: 50rem">
      <pv-column header="ID" field="id" sortable/>
      <pv-column header="Name" field="name" sortable/>
      <pv-column header="Price" field="price" sortable/>
      <pv-column header="Benefits" field="benefits"/>
      <pv-column header="Actions">
        <template #body="slotProps">
          <pv-button icon="pi pi-pencil" rounded text @click="router.push({name: 'subscription-and-plan-management-plan-edit', params: {id: slotProps.data.id}})"/>
          <pv-button icon="pi pi-trash" rounded severity="danger" text @click="confirmDelete(slotProps.data)"/>
        </template>
      </pv-column>
    </pv-data-table>
    <div v-if="errors.length" class="text-red-500 mt-3">
      {{ errors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>
