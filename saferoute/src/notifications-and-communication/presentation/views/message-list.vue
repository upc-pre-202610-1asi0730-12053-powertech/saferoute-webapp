<script setup>
import {useI18n} from "vue-i18n";
import {useRouter} from "vue-router";
import {useConfirm} from "primevue";
import {useNotificationStore} from "../../application/notification.store.js";
import {onMounted, toRefs} from "vue";

const {t} = useI18n();
const router = useRouter();
const confirm = useConfirm();
const store = useNotificationStore();
const {messages, errors, loaded} = toRefs(store);

onMounted(() => {
  if (!store.loaded) {
    store.fetchMessages();
  }
});

const confirmDelete = (message) => {
  confirm.require({
    message: `Are you sure you want to delete ${message.title}?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      store.deleteMessage(message);
    },
  });
};
</script>

<template>
  <div class="p-4">
    <h1>Alerts</h1>
    <pv-button label="New Alert" class="mb-3" icon="pi pi-plus" @click="router.push({name: 'notifications-and-communication-alert-new'})"/>
    <pv-data-table
        :loading="!loaded"
        :rows="5"
        :rows-per-page-options="[5, 10, 20]"
        :value="messages"
        paginator
        striped-rows
        table-style="min-width: 50rem">
      <pv-column header="ID" field="id" sortable/>
      <pv-column header="Title" field="title" sortable/>
      <pv-column header="Content" field="content"/>
      <pv-column header="Timestamp" field="timestamp" sortable/>
      <pv-column header="Actions">
        <template #body="slotProps">
          <pv-button icon="pi pi-pencil" rounded text @click="router.push({name: 'notifications-and-communication-alert-edit', params: {id: slotProps.data.id}})"/>
          <pv-button icon="pi pi-trash" rounded severity="danger" text @click="confirmDelete(slotProps.data)"/>
        </template>
      </pv-column>
    </pv-data-table>
    <div v-if="errors.length" class="text-red-500 mt-3">
      {{ errors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>
