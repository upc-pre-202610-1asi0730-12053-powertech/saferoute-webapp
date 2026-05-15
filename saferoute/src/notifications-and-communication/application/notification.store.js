import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {NotificationsApi} from "../infrastructure/notification-api.js";
import {NotificationAssembler} from "../infrastructure/notification.assembler.js";
import {AlertAssembler} from "../infrastructure/alert.assembler.js";
import {AnnouncementAssembler} from "../infrastructure/announcement.assembler.js";

const api = new NotificationsApi();

/**
 * Application store for the Notifications bounded context.
 * Matches NotificationsStore in vue-saferoute-notifications.puml.
 *
 * State: notifications, alerts, announcements
 */
export const useNotificationStore = defineStore('notification', () => {
    // ─── Diagram state ───────────────────────────────────────────────────────
    const notifications  = ref([]);
    const alerts         = ref([]);
    const announcements  = ref([]);
    const errors         = ref([]);
    const loaded         = ref(false);

    const count = computed(() => loaded.value ? notifications.value.length : 0);

    async function loadNotificationsByParent(parentId) {
        try {
            const response = await api.getNotificationsByParent(parentId);
            notifications.value = NotificationAssembler.toEntitiesFromResponse(response);
            loaded.value = true;
        } catch (error) { errors.value.push(error); }
    }

    async function loadAlerts(notificationId) {
        try {
            const response = await api.getAlertsByNotification(notificationId);
            alerts.value = AlertAssembler.toEntitiesFromResponse(response);
        } catch (error) { errors.value.push(error); }
    }

    async function loadAnnouncementsByRoute(routeId) {
        try {
            const response = await api.getAnnouncementsByRoute(routeId);
            announcements.value = AnnouncementAssembler.toEntitiesFromResponse(response);
        } catch (error) { errors.value.push(error); }
    }

    async function createNotification(request) {
        try {
            const response = await api.createNotification(request);
            const newNotif = NotificationAssembler.toEntityFromResource(response.data);
            notifications.value.push(newNotif);
            return newNotif;
        } catch (error) { errors.value.push(error); return null; }
    }

    async function triggerAlert(notificationId) {
        try {
            const response = await api.triggerAlert({ notificationId });
            const newAlert = AlertAssembler.toEntityFromResource(response.data);
            alerts.value.push(newAlert);
            return newAlert;
        } catch (error) { errors.value.push(error); return null; }
    }

    async function createAnnouncement(request) {
        try {
            const response = await api.createAnnouncement(request);
            const newAnn = AnnouncementAssembler.toEntityFromResource(response.data);
            announcements.value.push(newAnn);
            return newAnn;
        } catch (error) { errors.value.push(error); return null; }
    }

    async function markAsRead(notificationId) {
        try {
            await api.dispatchNotification(notificationId);
            const idx = notifications.value.findIndex(n => n.id === notificationId);
            if (idx !== -1) {
                notifications.value[idx].deliveryState = 'READ';
                notifications.value[idx].read = true;
            }
        } catch (error) { errors.value.push(error); }
    }

    // ─── Backward-compatible methods (used by existing views) ────────────────

    // Existing views use `messages` and `fetchMessages` — map to notifications
    const messages = notifications;

    function fetchMessages() {
        api.getMessages().then(response => {
            notifications.value = NotificationAssembler.toEntitiesFromResponse(response);
            loaded.value = true;
        }).catch(error => errors.value.push(error));
    }

    function getMessageById(id) {
        let idNum = parseInt(id);
        return notifications.value.find(m => m.id === idNum || m.id === id);
    }

    function addMessage(message) {
        api.createMessage(message).then(response => {
            const newMessage = NotificationAssembler.toEntityFromResource(response.data);
            notifications.value.push(newMessage);
        }).catch(error => errors.value.push(error));
    }

    function updateMessage(message) {
        api.updateMessage(message).then(response => {
            const updatedMessage = NotificationAssembler.toEntityFromResource(response.data);
            const index = notifications.value.findIndex(m => m.id === updatedMessage.id);
            if (index !== -1) notifications.value[index] = updatedMessage;
        }).catch(error => errors.value.push(error));
    }

    function deleteMessage(message) {
        api.deleteMessage(message.id).then(() => {
            const index = notifications.value.findIndex(m => m.id === message.id);
            if (index !== -1) notifications.value.splice(index, 1);
        }).catch(error => errors.value.push(error));
    }

    return {
        // diagram state
        notifications, alerts, announcements, errors, loaded, count,
        // diagram methods
        loadNotificationsByParent, loadAlerts, loadAnnouncementsByRoute,
        createNotification, triggerAlert, createAnnouncement, markAsRead,
        messages, fetchMessages, getMessageById, addMessage, updateMessage, deleteMessage
    }
});
