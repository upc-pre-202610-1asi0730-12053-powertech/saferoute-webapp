/**
 * Alert class within the Notifications bounded context.
 *
 * Defined in notifications.domain.model (vue-saferoute-notifications.puml).
 *
 * @class Alert
 */
export class Alert {
    /**
     * @param {Object} params
     * @param {?string} [params.id=null]
     * @param {?string} [params.notificationId=null]
     * @param {string} [params.triggeredAt='']
     */
    constructor({ id = null, notificationId = null, triggeredAt = '' }) {
        this.id = id;
        this.notificationId = notificationId;
        this.triggeredAt = triggeredAt;
    }
}
