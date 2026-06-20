/**
 * Notification class within the Notifications bounded context.
 *
 * Defined in notifications.domain.model (vue-saferoute-notifications.puml).
 *
 * @class Notification
 */
export class Notification {
    /**
     * @param {Object} params
     * @param {?string} [params.id=null]
     * @param {?string} [params.organizationId=null]
     * @param {?string} [params.parentId=null]
     * @param {?string} [params.tripId=null]
     * @param {string} [params.category='']
     * @param {string} [params.deliveryState='']
     * @param {string} [params.message='']
     * @param {string} [params.sentAt='']
     * @param {Array} [params.alerts=[]]
     * @param {Array} [params.announcements=[]]
     */
    constructor({
        id = null, organizationId = null, parentId = null, tripId = null,
        category = '', deliveryState = '', message = '', sentAt = '',
        alerts = [], announcements = [],
        type = '', timestamp = '', read = false,
        title = '', content = '',
    }) {
        this.id = id;
        this.organizationId = organizationId;
        this.parentId = parentId;
        this.tripId = tripId;
        this.category = category || type;
        this.deliveryState = deliveryState || (read ? 'READ' : 'UNREAD');
        this.message = message;
        this.sentAt = sentAt || timestamp;
        this.alerts = alerts;
        this.announcements = announcements;
        this.type = type || category;
        this.timestamp = timestamp || sentAt;
        this.read = read || deliveryState === 'READ';
        this.title = title || this.type || this.category;
        this.content = content || this.message;
    }
}
