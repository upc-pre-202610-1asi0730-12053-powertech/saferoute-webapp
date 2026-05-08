import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {NotificationApi} from "../infrastructure/notification-api.js";
import {MessageAssembler} from "../infrastructure/message.assembler.js";

const api = new NotificationApi();

export const useNotificationStore = defineStore('notification', () => {
    const messages = ref([]);
    const errors = ref([]);
    const loaded = ref(false);

    const count = computed(() => loaded.value ? messages.value.length : 0);

    function fetchMessages() {
        api.getMessages().then(response => {
            messages.value = MessageAssembler.toEntitiesFromResponse(response);
            loaded.value = true;
        }).catch(error => errors.value.push(error));
    }

    function getMessageById(id) {
        let idNum = parseInt(id);
        return messages.value.find(m => m.id === idNum);
    }

    function addMessage(message) {
        api.createMessage(message).then(response => {
            const newMessage = MessageAssembler.toEntityFromResource(response.data);
            messages.value.push(newMessage);
        }).catch(error => errors.value.push(error));
    }

    function updateMessage(message) {
        api.updateMessage(message).then(response => {
            const updatedMessage = MessageAssembler.toEntityFromResource(response.data);
            const index = messages.value.findIndex(m => m.id === updatedMessage.id);
            if (index !== -1) messages.value[index] = updatedMessage;
        }).catch(error => errors.value.push(error));
    }

    function deleteMessage(message) {
        api.deleteMessage(message.id).then(() => {
            const index = messages.value.findIndex(m => m.id === message.id);
            if (index !== -1) messages.value.splice(index, 1);
        }).catch(error => errors.value.push(error));
    }

    return { messages, errors, loaded, count, fetchMessages, getMessageById, addMessage, updateMessage, deleteMessage }
});
