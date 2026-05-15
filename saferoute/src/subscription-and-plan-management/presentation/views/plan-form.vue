<script setup>
import {useI18n} from "vue-i18n";
import {useRoute, useRouter} from "vue-router";
import {useSubscriptionStore} from "../../application/subscription.store.js";
import {computed, onMounted, ref} from "vue";
import {Plan} from "../../domain/model/plan.entity.js";

const {t} = useI18n();
const route = useRoute();
const router = useRouter();
const store = useSubscriptionStore();

const form = ref({name: '', price: 0, benefits: ''});
const isEdit = computed(() => !!route.params.id);

onMounted(() => {
  if (isEdit.value) {
    const planItem = store.getPlanById(route.params.id);
    if (planItem) {
      form.value.name = planItem.name;
      form.value.price = planItem.price;
      form.value.benefits = planItem.benefits;
    } else router.push({name: 'subscription-plans'});
  }
});

const savePlan = () => {
  const planItem = new Plan({
    id: isEdit.value ? route.params.id : null,
    name: form.value.name,
    price: form.value.price,
    benefits: form.value.benefits,
  });
  if (isEdit.value) store.updatePlan(planItem); else store.addPlan(planItem);
  router.push({name: 'subscription-plans'});
};
</script>

<template>
  <div class="p-4">
    <h1>{{ isEdit ? 'Edit Plan' : 'New Plan' }}</h1>
    <form @submit.prevent="savePlan">
      <div class="field mb-3">
        <label for="name">Name</label>
        <pv-input-text id="name" v-model="form.name" class="w-full" required/>
      </div>
      <div class="field mb-3">
        <label for="price">Price</label>
        <pv-input-number id="price" v-model="form.price" class="w-full" required/>
      </div>
      <div class="field mb-3">
        <label for="benefits">Benefits</label>
        <pv-textarea id="benefits" v-model="form.benefits" class="w-full" rows="3" required/>
      </div>
      <pv-button label="Save" icon="pi pi-save" type="submit"/>
      <pv-button label="Cancel" class="ml-2" severity="secondary" @click="router.push({name: 'subscription-plans'})"/>
    </form>
    <div v-if="store.errors.length" class="text-red-500 mt-3">
      {{ store.errors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>
