/**
 * Subscription state constants.
 * @readonly
 * @enum {string}
 */
export const SubscriptionState = Object.freeze({
    ACTIVE:    'ACTIVE',
    CANCELLED: 'CANCELLED',
    EXPIRED:   'EXPIRED'
});

/**
 * Subscription entity within the Subscription bounded context.
 * Links an Organization (from IAM) to a Plan during a date range.
 *
 * @class Subscription
 */
export class Subscription {
    /**
     * @param {Object} params - Entity attributes.
     * @param {?string} [params.id=null] - Subscription identifier.
     * @param {?string} [params.organizationId=null] - FK of the subscribed organization.
     * @param {?string} [params.planId=null] - FK of the chosen plan.
     * @param {string} [params.state='ACTIVE'] - Lifecycle state ('ACTIVE' | 'CANCELLED' | 'EXPIRED').
     * @param {?string} [params.startDate=null] - ISO start date.
     * @param {?string} [params.endDate=null] - ISO end date.
     */
    constructor({ id = null, organizationId = null, planId = null, state = 'ACTIVE', startDate = null, endDate = null }) {
        this.id = id;
        this.organizationId = organizationId;
        this.planId = planId;
        this.state = state;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    /** @returns {boolean} */
    isActive() { return this.state === SubscriptionState.ACTIVE; }

    /**
     * Days remaining until endDate, clamped at zero. Returns null if no endDate.
     * @returns {?number}
     */
    getRemainingDays() {
        if (!this.endDate) return null;
        const end = new Date(this.endDate).getTime();
        if (Number.isNaN(end)) return null;
        const diffMs = end - Date.now();
        return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }
}
