/**
 * User entity within the IAM bounded context.
 *
 * @class User
 */
export class User {
    /**
     * @param {Object} params - Entity attributes.
     * @param {?string} [params.id=null] - User identifier.
     * @param {string} [params.firstName=''] - User's first name.
     * @param {string} [params.lastName=''] - User's last name.
     * @param {string} [params.email=''] - User's email address.
     * @param {string} [params.roleTier=''] - Role tier (e.g. 'ADMIN', 'DRIVER', 'PARENT').
     * @param {?string} [params.organizationId=null] - FK of the organization the user belongs to.
     */
    constructor({ id = null, firstName = '', lastName = '', email = '', roleTier = '', role = '', organizationId = null }) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.roleTier = roleTier || role;
        this.organizationId = organizationId;
    }

    /**
     * Convenience computed full name.
     * @returns {string}
     */
    get fullName() {
        return `${this.firstName} ${this.lastName}`.trim();
    }

    /**
     * Whether the user has administrator privileges.
     * @returns {boolean}
     */
    isAdmin() {
        return this.roleTier === 'ADMIN';
    }
}
