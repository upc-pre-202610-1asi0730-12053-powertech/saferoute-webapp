<script setup>
import {useI18n} from "vue-i18n";
import {useRouter} from "vue-router";
import {useConfirm} from "primevue";
import {useRouteStore} from "../../application/route.store.js";
import {useIamStore} from "../../../../identity-and-access-management/application/iam.store.js";
import {onMounted, toRefs} from "vue";

const {t} = useI18n();
const router = useRouter();
const confirm = useConfirm();
const store = useRouteStore();
const iamStore = useIamStore();
const {routes, errors, loaded} = toRefs(store);

onMounted(() => {
  store.fetchRoutes(iamStore.currentUser?.organizationId);
});

const confirmDelete = (route) => {
  confirm.require({
    message: `Are you sure you want to delete ${route.name}?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      store.deleteRoute(route);
    },
  });
};
</script>

<template>
  <div class="p-4">
    <h1>Routes</h1>
    <pv-button label="New Route" class="mb-3" icon="pi pi-plus" @click="router.push({name: 'fleet-and-route-planning-fleet-and-route-planning-new'})"/>
    <pv-data-table
        :loading="!loaded"
        :rows="5"
        :rows-per-page-options="[5, 10, 20]"
        :value="routes"
        paginator
        striped-rows
        table-style="min-width: 50rem">
      <pv-column header="ID" field="id" sortable/>
      <pv-column header="Name" field="name" sortable/>
      <pv-column header="Origin" field="origin"/>
      <pv-column header="Destination" field="destination"/>
      <pv-column header="Actions">
        <template #body="slotProps">
          <pv-button icon="pi pi-pencil" rounded text @click="router.push({name: 'fleet-and-route-planning-fleet-and-route-planning-edit', params: {id: slotProps.data.id}})"/>
          <pv-button icon="pi pi-trash" rounded severity="danger" text @click="confirmDelete(slotProps.data)"/>
        </template>
      </pv-column>
    </pv-data-table>
    <div v-if="errors.length" class="text-red-500 mt-3">
      {{ errors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>
