import {BaseApi} from "../../shared/infrastructure/base-api.js";
import {BaseEndpoint} from "../../shared/infrastructure/base-endpoint.js";
import seedData from '../../server/db.json';

const endpointPath = import.meta.env.VITE_NOTIFICATION_ENDPOINT_PATH || '/notifications';
const useFakeAuth  = String(import.meta.env.VITE_USE_FAKE_AUTH).toLowerCase() === 'true';

function getCurrentOrgId() {
    try { return JSON.parse(localStorage.getItem('saferoute.user') || '{}').organizationId || null; }
    catch { return null; }
}

function mockAlertKey() { return `saferoute.mock.alerts.${getCurrentOrgId() || 'default'}`; }
function mockAnnouncementKey() { return `saferoute.mock.announcements.${getCurrentOrgId() || 'default'}`; }

function mockNotifications(orgId) {
    const id = orgId || getCurrentOrgId();
    return id ? seedData.notifications.filter(n => n.organizationId === id) : [];
}

function mockAlerts() { return JSON.parse(localStorage.getItem(mockAlertKey()) || '[]'); }
function mockAnnouncements() { return JSON.parse(localStorage.getItem(mockAnnouncementKey()) || '[]'); }

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
            const newNotif = { ...request, id: `n-${Date.now()}` };
            return Promise.resolve({ status: 201, data: newNotif });
        }
        return this.#notificationsEndpoint.create(request);
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
        return this.http.patch(`${endpointPath}/${id}`, { deliveryState: 'DISPATCHED' });
    }

    triggerAlert(request) {
        if (useFakeAuth) {
            const newAlert = { ...request, id: `a-${Date.now()}`, triggeredAt: new Date().toISOString() };
            const list = mockAlerts();
            list.push(newAlert);
            localStorage.setItem(mockAlertKey(), JSON.stringify(list));
            return Promise.resolve({ status: 201, data: newAlert });
        }
        return this.http.post('/alerts', request);
    }

    getAlertsByNotification(notificationId) {
        if (useFakeAuth) {
            const filtered = mockAlerts().filter(a => a.notificationId === notificationId);
            return Promise.resolve({ status: 200, data: filtered });
        }
        return this.http.get(`/alerts?notificationId=${notificationId}`);
    }

    createAnnouncement(request) {
        if (useFakeAuth) {
            const newAnn = { ...request, id: `ann-${Date.now()}`, publishedAt: new Date().toISOString() };
            const list = mockAnnouncements();
            list.push(newAnn);
            localStorage.setItem(mockAnnouncementKey(), JSON.stringify(list));
            return Promise.resolve({ status: 201, data: newAnn });
        }
        return this.http.post('/announcements', request);
    }

    getAnnouncementsByRoute(routeId) {
        if (useFakeAuth) {
            const filtered = mockAnnouncements().filter(a => a.routeId === routeId);
            return Promise.resolve({ status: 200, data: filtered });
        }
        return this.http.get(`/announcements?routeId=${routeId}`);
    }

    // ─── Backward-compatible methods ─────────────────────────────────────────

    getMessages(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockNotifications(organizationId) });
        return organizationId
            ? this.http.get(`${endpointPath}?organizationId=${organizationId}`)
            : this.#notificationsEndpoint.getAll();
    }

    getMessageById(id) { return this.#notificationsEndpoint.getById(id); }
    createMessage(resource) { return this.createNotification(resource); }
    updateMessage(resource) { return this.#notificationsEndpoint.update(resource.id, resource); }
    deleteMessage(id) { return this.#notificationsEndpoint.delete(id); }
}

/**
 * Backward-compatible alias.
 */
export { NotificationsApi as NotificationApi };
