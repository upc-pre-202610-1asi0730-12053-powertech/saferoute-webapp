/**
 * StudentGroup class within the Stakeholder bounded context.
 *
 * Defined in stakeholder.domain.model (vue-saferoute-stakeholder.puml).
 *
 * @class StudentGroup
 */
export class StudentGroup {
    /**
     * @param {Object} params
     * @param {?string} [params.id=null]
     * @param {string} [params.name='']
     * @param {?string} [params.organizationId=null]
     * @param {string[]} [params.childIds=[]]
     * @param {boolean} [params.isFinalized=false]
     */
    constructor({ id = null, name = '', organizationId = null, childIds = [], isFinalized = false }) {
        this.id = id;
        this.name = name;
        this.organizationId = organizationId;
        this.childIds = childIds;
        this.isFinalized = isFinalized;
    }
}
