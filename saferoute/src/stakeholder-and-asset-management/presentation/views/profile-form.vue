<script setup>
import {useI18n} from "vue-i18n";
import {useRoute, useRouter} from "vue-router";
import {useStakeholderStore} from "../../application/stakeholder.store.js";
import {computed, onMounted, ref} from "vue";
import {Profile} from "../../domain/model/profile.entity.js";

const {t} = useI18n();
const route = useRoute();
const router = useRouter();
const store = useStakeholderStore();

const form = ref({firstName: '', lastName: '', phone: ''});
const isEdit = computed(() => !!route.params.id);

onMounted(() => {
  if (isEdit.value) {
    const profile = store.getProfileById(route.params.id);
    if (profile) {
      form.value.firstName = profile.firstName;
      form.value.lastName = profile.lastName;
      form.value.phone = profile.phone;
    } else router.push({name: 'stakeholder-and-asset-management-profiles'});
  }
});

const saveProfile = () => {
  const profile = new Profile({
    id: isEdit.value ? route.params.id : null,
    firstName: form.value.firstName,
    lastName: form.value.lastName,
    phone: form.value.phone,
  });
  if (isEdit.value) store.updateProfile(profile); else store.addProfile(profile);
  router.push({name: 'stakeholder-and-asset-management-profiles'});
};
</script>

<template>
  <div class="p-4">
    <h1>{{ isEdit ? 'Edit Profile' : 'New Profile' }}</h1>
    <form @submit.prevent="saveProfile">
      <div class="field mb-3">
        <label for="firstName">First Name</label>
        <pv-input-text id="firstName" v-model="form.firstName" class="w-full" required/>
      </div>
      <div class="field mb-3">
        <label for="lastName">Last Name</label>
        <pv-input-text id="lastName" v-model="form.lastName" class="w-full" required/>
      </div>
      <div class="field mb-3">
        <label for="phone">Phone</label>
        <pv-input-text id="phone" v-model="form.phone" class="w-full" required/>
      </div>
      <pv-button label="Save" icon="pi pi-save" type="submit"/>
      <pv-button label="Cancel" class="ml-2" severity="secondary" @click="router.push({name: 'stakeholder-and-asset-management-profiles'})"/>
    </form>
    <div v-if="store.errors.length" class="text-red-500 mt-3">
      {{ store.errors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>
