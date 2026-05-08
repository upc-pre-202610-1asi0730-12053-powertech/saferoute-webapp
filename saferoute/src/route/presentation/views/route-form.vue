<script setup>
import {useI18n} from "vue-i18n";
import {useRoute, useRouter} from "vue-router";
import {useRouteStore} from "../../application/route.store.js";
import {computed, onMounted, ref} from "vue";
import {Route} from "../../domain/model/route.entity.js";

const {t} = useI18n();
const routerPath = useRoute();
const router = useRouter();
const store = useRouteStore();

const form = ref({name: '', origin: '', destination: ''});
const isEdit = computed(() => !!routerPath.params.id);

onMounted(() => {
  if (isEdit.value) {
    const routeItem = store.getRouteById(routerPath.params.id);
    if (routeItem) {
      form.value.name = routeItem.name;
      form.value.origin = routeItem.origin;
      form.value.destination = routeItem.destination;
    } else router.push({name: 'route-routes'});
  }
});

const saveRoute = () => {
  const routeItem = new Route({
    id: isEdit.value ? routerPath.params.id : null,
    name: form.value.name,
    origin: form.value.origin,
    destination: form.value.destination,
  });
  if (isEdit.value) store.updateRoute(routeItem); else store.addRoute(routeItem);
  router.push({name: 'route-routes'});
};
</script>

<template>
  <div class="p-4">
    <h1>{{ isEdit ? 'Edit Route' : 'New Route' }}</h1>
    <form @submit.prevent="saveRoute">
      <div class="field mb-3">
        <label for="name">Name</label>
        <pv-input-text id="name" v-model="form.name" class="w-full" required/>
      </div>
      <div class="field mb-3">
        <label for="origin">Origin</label>
        <pv-input-text id="origin" v-model="form.origin" class="w-full" required/>
      </div>
      <div class="field mb-3">
        <label for="destination">Destination</label>
        <pv-input-text id="destination" v-model="form.destination" class="w-full" required/>
      </div>
      <pv-button label="Save" icon="pi pi-save" type="submit"/>
      <pv-button label="Cancel" class="ml-2" severity="secondary" @click="router.push({name: 'route-routes'})"/>
    </form>
    <div v-if="store.errors.length" class="text-red-500 mt-3">
      {{ store.errors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>
