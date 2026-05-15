<script setup>
import {useI18n} from "vue-i18n";
import {useRoute, useRouter} from "vue-router";
import {useTripStore} from "../../application/trip.store.js";
import {computed, onMounted, ref} from "vue";
import {Trip} from "../../domain/model/trip.entity.js";

const {t} = useI18n();
const route = useRoute();
const router = useRouter();
const store = useTripStore();

const form = ref({routeId: null, driverId: null, status: '', currentLocation: ''});
const isEdit = computed(() => !!route.params.id);

onMounted(() => {
  if (isEdit.value) {
    const tripItem = store.getTripById(route.params.id);
    if (tripItem) {
      form.value.routeId = tripItem.routeId;
      form.value.driverId = tripItem.driverId;
      form.value.status = tripItem.status;
      form.value.currentLocation = tripItem.currentLocation;
    } else router.push({name: 'trip-execution-and-monitoring-trips'});
  }
});

const saveTrip = () => {
  const tripItem = new Trip({
    id: isEdit.value ? route.params.id : null,
    routeId: form.value.routeId,
    driverId: form.value.driverId,
    status: form.value.status,
    currentLocation: form.value.currentLocation,
  });
  if (isEdit.value) store.updateTrip(tripItem); else store.addTrip(tripItem);
  router.push({name: 'trip-execution-and-monitoring-trips'});
};
</script>

<template>
  <div class="p-4">
    <h1>{{ isEdit ? 'Edit Trip' : 'New Trip' }}</h1>
    <form @submit.prevent="saveTrip">
      <div class="field mb-3">
        <label for="routeId">Route ID</label>
        <pv-input-number id="routeId" v-model="form.routeId" class="w-full" required/>
      </div>
      <div class="field mb-3">
        <label for="driverId">Driver ID</label>
        <pv-input-number id="driverId" v-model="form.driverId" class="w-full" required/>
      </div>
      <div class="field mb-3">
        <label for="status">Status</label>
        <pv-input-text id="status" v-model="form.status" class="w-full" required/>
      </div>
      <div class="field mb-3">
        <label for="currentLocation">Current Location</label>
        <pv-input-text id="currentLocation" v-model="form.currentLocation" class="w-full" required/>
      </div>
      <pv-button label="Save" icon="pi pi-save" type="submit"/>
      <pv-button label="Cancel" class="ml-2" severity="secondary" @click="router.push({name: 'trip-execution-and-monitoring-trips'})"/>
    </form>
    <div v-if="store.errors.length" class="text-red-500 mt-3">
      {{ store.errors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>
