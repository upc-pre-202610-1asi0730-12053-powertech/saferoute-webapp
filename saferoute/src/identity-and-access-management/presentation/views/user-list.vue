<script setup>
import {useI18n} from "vue-i18n";
import {useRouter} from "vue-router";
import {useConfirm} from "primevue";
import {useIamStore} from "../../application/iam.store.js";
import {onMounted, toRefs} from "vue";

const {t} = useI18n();
const router = useRouter();
const confirm = useConfirm();
const store = useIamStore();
const {users, errors, loaded} = toRefs(store);

onMounted(() => {
  if (!store.loaded) {
    store.fetchUsers();
  }
});

const confirmDelete = (user) => {
  confirm.require({
    message: `Are you sure you want to delete ${user.username}?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      store.deleteUser(user);
    },
  });
};
</script>

<template>
  <div class="p-4">
    <h1>Users</h1>
    <pv-button label="New User" class="mb-3" icon="pi pi-plus" @click="router.push({name: 'iam-user-new'})"/>
    <pv-data-table
        :loading="!loaded"
        :rows="5"
        :rows-per-page-options="[5, 10, 20]"
        :value="users"
        paginator
        striped-rows
        table-style="min-width: 50rem">
      <pv-column header="ID" field="id" sortable/>
      <pv-column header="Username" field="username" sortable/>
      <pv-column header="Email" field="email"/>
      <pv-column header="Roles" field="roles"/>
      <pv-column header="Actions">
        <template #body="slotProps">
          <pv-button icon="pi pi-pencil" rounded text @click="router.push({name: 'iam-user-edit', params: {id: slotProps.data.id}})"/>
          <pv-button icon="pi pi-trash" rounded severity="danger" text @click="confirmDelete(slotProps.data)"/>
        </template>
      </pv-column>
    </pv-data-table>
    <div v-if="errors.length" class="text-red-500 mt-3">
      {{ errors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>
