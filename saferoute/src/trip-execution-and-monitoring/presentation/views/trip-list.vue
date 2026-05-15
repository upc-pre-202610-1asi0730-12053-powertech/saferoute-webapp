<script setup>
import {useI18n} from "vue-i18n";
import {useRouter} from "vue-router";
import {useConfirm} from "primevue";
import {useTripStore} from "../../application/trip.store.js";
import {useIamStore} from "../../../../identity-and-access-management/application/iam.store.js";
import {onMounted, toRefs} from "vue";

const {t} = useI18n();
const router = useRouter();
const confirm = useConfirm();
const store = useTripStore();
const iamStore = useIamStore();
const {trips, errors, loaded} = toRefs(store);

onMounted(() => {
  store.fetchTrips(iamStore.currentUser?.organizationId);
});

const confirmDelete = (trip) => {
  confirm.require({
    message: `Are you sure you want to delete this trip?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      store.deleteTrip(trip);
    },
  });
};
</script>

<template>
  <div class="p-4">
    <h1>Trips</h1>
    <pv-button label="New Trip" class="mb-3" icon="pi pi-plus" @click="router.push({name: 'trip-execution-and-monitoring-trip-execution-and-monitoring-new'})"/>
    <pv-data-table
        :loading="!loaded"
        :rows="5"
        :rows-per-page-options="[5, 10, 20]"
        :value="trips"
        paginator
        striped-rows
        table-style="min-width: 50rem">
      <pv-column header="ID" field="id" sortable/>
      <pv-column header="Route ID" field="routeId" sortable/>
      <pv-column header="Driver ID" field="driverId"/>
      <pv-column header="Status" field="status"/>
      <pv-column header="Location" field="currentLocation"/>
      <pv-column header="Actions">
        <template #body="slotProps">
          <pv-button icon="pi pi-pencil" rounded text @click="router.push({name: 'trip-execution-and-monitoring-trip-execution-and-monitoring-edit', params: {id: slotProps.data.id}})"/>
          <pv-button icon="pi pi-trash" rounded severity="danger" text @click="confirmDelete(slotProps.data)"/>
        </template>
      </pv-column>
    </pv-data-table>
    <div v-if="errors.length" class="text-red-500 mt-3">
      {{ errors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>
