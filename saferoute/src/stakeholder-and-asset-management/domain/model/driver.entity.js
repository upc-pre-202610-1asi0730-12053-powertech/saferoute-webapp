/**
 * Driver class within the Stakeholder bounded context.
 *
 * Defined in stakeholder.domain.model (vue-saferoute-stakeholder.puml).
 *
 * @class Driver
 */
export class Driver {
    /**
     * @param {Object} params
     * @param {?string} [params.id=null]
     * @param {string} [params.fullName='']
     * @param {string} [params.email='']
     * @param {string} [params.phoneNumber='']
     * @param {string} [params.licenseNumber='']
     * @param {?string} [params.organizationId=null]
     */
    constructor({ id = null, fullName = '', email = '', phoneNumber = '', licenseNumber = '', organizationId = null }) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.licenseNumber = licenseNumber;
        this.organizationId = organizationId;
    }
}
