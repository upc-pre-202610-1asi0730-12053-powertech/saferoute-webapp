/**
 * Organization entity within the IAM bounded context.
 * Represents a company that contracts the SafeRoute platform (e.g. a school
 * transport provider) and groups users, routes, trips, and a subscription-and-plan-management.
 *
 * @class Organization
 */
export class Organization {
    /**
     * @param {Object} params - Entity attributes.
     * @param {?string} [params.id=null] - Organization identifier.
     * @param {string} [params.name=''] - Organization name.
     * @param {string} [params.status='ACTIVE'] - Lifecycle status ('ACTIVE' | 'SUSPENDED').
     * @param {?string} [params.createdAt=null] - ISO creation timestamp.
     */
    constructor({ id = null, name = '', status = 'ACTIVE', createdAt = null }) {
        this.id = id;
        this.name = name;
        this.status = status;
        this.createdAt = createdAt;
    }

    /**
     * Whether the organization is active.
     * @returns {boolean}
     */
    isActive() {
        return this.status === 'ACTIVE';
    }
}
