<script setup>
import {useI18n} from "vue-i18n";
import {useRouter} from "vue-router";
import {useConfirm} from "primevue";
import {useStakeholderStore} from "../../application/stakeholder.store.js";
import {onMounted, toRefs} from "vue";

const {t} = useI18n();
const router = useRouter();
const confirm = useConfirm();
const store = useStakeholderStore();
const {profiles, errors, loaded} = toRefs(store);

onMounted(() => {
  if (!store.loaded) {
    store.fetchProfiles();
  }
});

const confirmDelete = (profile) => {
  confirm.require({
    message: `Are you sure you want to delete ${profile.firstName}?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      store.deleteProfile(profile);
    },
  });
};
</script>

<template>
  <div class="p-4">
    <h1>Profiles</h1>
    <pv-button label="New Profile" class="mb-3" icon="pi pi-plus" @click="router.push({name: 'stakeholder-and-asset-management-profile-new'})"/>
    <pv-data-table
        :loading="!loaded"
        :rows="5"
        :rows-per-page-options="[5, 10, 20]"
        :value="profiles"
        paginator
        striped-rows
        table-style="min-width: 50rem">
      <pv-column header="ID" field="id" sortable/>
      <pv-column header="First Name" field="firstName" sortable/>
      <pv-column header="Last Name" field="lastName" sortable/>
      <pv-column header="Phone" field="phone"/>
      <pv-column header="Actions">
        <template #body="slotProps">
          <pv-button icon="pi pi-pencil" rounded text @click="router.push({name: 'stakeholder-and-asset-management-profile-edit', params: {id: slotProps.data.id}})"/>
          <pv-button icon="pi pi-trash" rounded severity="danger" text @click="confirmDelete(slotProps.data)"/>
        </template>
      </pv-column>
    </pv-data-table>
    <div v-if="errors.length" class="text-red-500 mt-3">
      {{ errors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>
