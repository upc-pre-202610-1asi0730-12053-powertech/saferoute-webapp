<script setup>
import {useI18n} from "vue-i18n";
import {useRoute, useRouter} from "vue-router";
import {useNotificationStore} from "../../application/notification.store.js";
import {computed, onMounted, ref} from "vue";
import {Message} from "../../domain/model/message.entity.js";

const {t} = useI18n();
const route = useRoute();
const router = useRouter();
const store = useNotificationStore();

const form = ref({title: '', content: '', timestamp: ''});
const isEdit = computed(() => !!route.params.id);

onMounted(() => {
  if (isEdit.value) {
    const messageItem = store.getMessageById(route.params.id);
    if (messageItem) {
      form.value.title = messageItem.title;
      form.value.content = messageItem.content;
      form.value.timestamp = messageItem.timestamp;
    } else router.push({name: 'notification-alerts'});
  }
});

const saveMessage = () => {
  const messageItem = new Message({
    id: isEdit.value ? route.params.id : null,
    title: form.value.title,
    content: form.value.content,
    timestamp: form.value.timestamp || new Date().toISOString(),
  });
  if (isEdit.value) store.updateMessage(messageItem); else store.addMessage(messageItem);
  router.push({name: 'notification-alerts'});
};
</script>

<template>
  <div class="p-4">
    <h1>{{ isEdit ? 'Edit Alert' : 'New Alert' }}</h1>
    <form @submit.prevent="saveMessage">
      <div class="field mb-3">
        <label for="title">Title</label>
        <pv-input-text id="title" v-model="form.title" class="w-full" required/>
      </div>
      <div class="field mb-3">
        <label for="content">Content</label>
        <pv-textarea id="content" v-model="form.content" class="w-full" rows="4" required/>
      </div>
      <pv-button label="Save" icon="pi pi-save" type="submit"/>
      <pv-button label="Cancel" class="ml-2" severity="secondary" @click="router.push({name: 'notification-alerts'})"/>
    </form>
    <div v-if="store.errors.length" class="text-red-500 mt-3">
      {{ store.errors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>
