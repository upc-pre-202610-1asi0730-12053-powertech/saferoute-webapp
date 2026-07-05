import {BaseApi} from "../../shared/infrastructure/base-api.js";
import {BaseEndpoint} from "../../shared/infrastructure/base-endpoint.js";

const endpointPath = import.meta.env.VITE_NOTIFICATION_ENDPOINT_PATH || '/notifications';
const useFakeAuth  = String(import.meta.env.VITE_USE_FAKE_AUTH).toLowerCase() === 'true';

function getCurrentOrgId() {
    try { return JSON.parse(localStorage.getItem('saferoute.user') || '{}').organizationId || null; }
    catch { return null; }
}

function mockAlertKey() { return `saferoute.mock.alerts.${getCurrentOrgId() || 'default'}`; }
function mockAnnouncementKey() { return `saferoute.mock.announcements.${getCurrentOrgId() || 'default'}`; }
function mockNotificationKey() { return `saferoute.mock.notifications.${getCurrentOrgId() || 'default'}`; }

function mockNotifications() {
    return [];
}

function mockAlerts() { return JSON.parse(localStorage.getItem(mockAlertKey()) || '[]'); }
function mockAnnouncements() { return JSON.parse(localStorage.getItem(mockAnnouncementKey()) || '[]'); }
function mockExtraNotifications() { return JSON.parse(localStorage.getItem(mockNotificationKey()) || '[]'); }

function saveLocalNotification(request) {
    const notification = {
        ...request,
        id: request.id || `n-${Date.now()}`,
        organizationId: request.organizationId || getCurrentOrgId() || null,
        category: request.category || request.type || request.title || 'GENERAL',
        type: request.type || request.category || request.title || 'GENERAL',
        message: request.message || request.content || '',
        content: request.content || request.message || '',
        title: request.title || request.category || request.type || 'GENERAL',
        sentAt: request.sentAt || request.timestamp || new Date().toISOString(),
        timestamp: request.timestamp || request.sentAt || new Date().toISOString(),
        deliveryState: request.deliveryState || (request.read ? 'DELIVERED' : 'PENDING'),
        alerts: request.alerts || [],
        announcements: request.announcements || [],
    };
    const list = mockExtraNotifications();
    const index = list.findIndex(item => String(item.id) === String(notification.id));
    if (index === -1) list.push(notification);
    else list[index] = notification;
    localStorage.setItem(mockNotificationKey(), JSON.stringify(list));
    return notification;
}

function hasBackendNotificationFields(request) {
    return !!(request.organizationId && request.parentId && request.tripId && (request.category || request.type) && (request.message || request.content));
}

function toCreateNotificationPayload(request) {
    return {
        organizationId: request.organizationId,
        parentId: request.parentId,
        tripId: request.tripId,
        category: request.category || request.type,
        message: request.message || request.content,
    };
}

function withMessageFields(notification) {
    return {
        ...notification,
        title: notification.title || notification.category || notification.type || '',
        content: notification.content || notification.message || '',
        timestamp: notification.timestamp || notification.sentAt || '',
        type: notification.type || notification.category || '',
        read: notification.read || notification.deliveryState === 'DELIVERED',
    };
}

function latestAlert(notificationId, notification) {
    const alerts = notification?.alerts || [];
    const alert = alerts[alerts.length - 1] || {};
    return { notificationId, ...alert };
}

function latestAnnouncement(notificationId, notification) {
    const announcements = notification?.announcements || [];
    const announcement = announcements[announcements.length - 1] || {};
    return { notificationId, ...announcement };
}

/**
 * Infrastructure gateway for the Notifications bounded context.
 * Matches NotificationsApi in vue-saferoute-notifications.puml.
 *
 * @class NotificationsApi
 * @extends BaseApi
 */
export class NotificationsApi extends BaseApi {
    #notificationsEndpoint;

    constructor() {
        super();
        this.#notificationsEndpoint = new BaseEndpoint(this, endpointPath);
    }

    createNotification(request) {
        if (useFakeAuth) {
            const newNotif = saveLocalNotification(request);
            return Promise.resolve({ status: 201, data: newNotif });
        }
        if (!hasBackendNotificationFields(request)) {
            return Promise.resolve({ status: 201, data: saveLocalNotification(request) });
        }
        return this.#notificationsEndpoint.create(toCreateNotificationPayload(request));
    }

    getNotificationsByParent(parentId) {
        if (useFakeAuth) {
            const filtered = mockNotifications().filter(n => n.parentId === parentId);
            return Promise.resolve({ status: 200, data: filtered });
        }
        return this.http.get(`${endpointPath}?parentId=${parentId}`);
    }

    dispatchNotification(id) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: { id, deliveryState: 'DISPATCHED' } });
        return this.http.post(`${endpointPath}/${id}/dispatch`);
    }

    triggerAlert(request) {
        if (useFakeAuth) {
            const newAlert = { ...request, id: `a-${Date.now()}`, triggeredAt: new Date().toISOString() };
            const list = mockAlerts();
            list.push(newAlert);
            localStorage.setItem(mockAlertKey(), JSON.stringify(list));
            return Promise.resolve({ status: 201, data: newAlert });
        }
        if (!request.notificationId) {
            return Promise.resolve({ status: 201, data: { ...request, id: `a-${Date.now()}`, triggeredAt: new Date().toISOString() } });
        }
        return this.http
            .post(`${endpointPath}/${request.notificationId}/alerts`, { panic: request.panic ?? true })
            .then(response => ({ ...response, data: latestAlert(request.notificationId, response.data) }));
    }

    async getAlertsByNotification(notificationId) {
        if (useFakeAuth) {
            const filtered = mockAlerts().filter(a => a.notificationId === notificationId);
            return Promise.resolve({ status: 200, data: filtered });
        }
        const response = await this.#notificationsEndpoint.getById(notificationId);
        return {
            ...response,
            data: (response.data?.alerts || []).map(alert => ({ notificationId, ...alert })),
        };
    }

    createAnnouncement(request) {
        if (useFakeAuth) {
            const newAnn = { ...request, id: `ann-${Date.now()}`, publishedAt: new Date().toISOString() };
            const list = mockAnnouncements();
            list.push(newAnn);
            localStorage.setItem(mockAnnouncementKey(), JSON.stringify(list));
            return Promise.resolve({ status: 201, data: newAnn });
        }
        if (!request.notificationId) {
            return Promise.resolve({ status: 201, data: { ...request, id: `ann-${Date.now()}`, publishedAt: new Date().toISOString() } });
        }
        return this.http
            .post(`${endpointPath}/${request.notificationId}/announcements`, {
                routeId: request.routeId,
                message: request.message,
            })
            .then(response => ({ ...response, data: latestAnnouncement(request.notificationId, response.data) }));
    }

    async getAnnouncementsByRoute(routeId) {
        if (useFakeAuth) {
            const filtered = mockAnnouncements().filter(a => a.routeId === routeId);
            return Promise.resolve({ status: 200, data: filtered });
        }
        const response = await this.#notificationsEndpoint.getAll();
        const announcements = (response.data || []).flatMap(notification =>
            (notification.announcements || []).map(announcement => ({
                notificationId: notification.id,
                ...announcement,
            }))
        ).filter(announcement => String(announcement.routeId) === String(routeId));
        return { ...response, data: announcements };
    }

    // ─── Backward-compatible methods ─────────────────────────────────────────

    getMessages(organizationId) {
        if (useFakeAuth) {
            return Promise.resolve({
                status: 200,
                data: [...mockNotifications(organizationId), ...mockExtraNotifications()].map(withMessageFields),
            });
        }
        return this.#notificationsEndpoint.getAll().then(response => ({
            ...response,
            data: [
                ...(response.data || []).filter(notification => !organizationId || notification.organizationId === organizationId),
                ...mockExtraNotifications().filter(notification => !organizationId || notification.organizationId === organizationId),
            ].map(withMessageFields),
        }));
    }

    getMessageById(id) { return this.#notificationsEndpoint.getById(id); }
    createMessage(resource) { return this.createNotification(resource); }
    updateMessage(resource) {
        return Promise.resolve({ status: 200, data: saveLocalNotification(resource) });
    }
    deleteMessage(id) {
        const list = mockExtraNotifications().filter(item => String(item.id) !== String(id));
        localStorage.setItem(mockNotificationKey(), JSON.stringify(list));
        return Promise.resolve({ status: 204, data: {} });
    }
}

/**
 * Backward-compatible alias.
 */
export { NotificationsApi as NotificationApi };
