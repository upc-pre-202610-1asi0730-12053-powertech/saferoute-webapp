/**
 * Parent class within the Stakeholder bounded context.
 *
 * Defined in stakeholder.domain.model (vue-saferoute-stakeholder.puml).
 *
 * @class Parent
 */
export class Parent {
    /**
     * @param {Object} params
     * @param {?string} [params.id=null]
     * @param {string} [params.fullName='']
     * @param {string} [params.email='']
     * @param {string} [params.phoneNumber='']
     * @param {?string} [params.organizationId=null]
     * @param {Array} [params.children=[]]
     */
    constructor({ id = null, fullName = '', email = '', phoneNumber = '', organizationId = null, children = [] }) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.organizationId = organizationId;
        this.children = children;
    }
}
