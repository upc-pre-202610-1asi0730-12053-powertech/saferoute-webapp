/**
 * Announcement class within the Notifications bounded context.
 *
 * Defined in notifications.domain.model (vue-saferoute-notifications.puml).
 *
 * @class Announcement
 */
export class Announcement {
    /**
     * @param {Object} params
     * @param {?string} [params.id=null]
     * @param {?string} [params.notificationId=null]
     * @param {?string} [params.routeId=null]
     * @param {string} [params.message='']
     * @param {string} [params.publishedAt='']
     */
    constructor({ id = null, notificationId = null, routeId = null, message = '', publishedAt = '' }) {
        this.id = id;
        this.notificationId = notificationId;
        this.routeId = routeId;
        this.message = message;
        this.publishedAt = publishedAt;
    }
}
