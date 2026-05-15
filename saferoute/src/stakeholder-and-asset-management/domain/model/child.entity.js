/**
 * Child class within the Stakeholder bounded context.
 *
 * Defined in stakeholder.domain.model (vue-saferoute-stakeholder.puml).
 *
 * @class Child
 */
export class Child {
    /**
     * @param {Object} params
     * @param {?string} [params.id=null]
     * @param {string} [params.fullName='']
     * @param {number} [params.age=0]
     * @param {string} [params.enrollmentState='']
     * @param {?string} [params.parentId=null]
     */
    constructor({ id = null, fullName = '', age = 0, enrollmentState = '', parentId = null }) {
        this.id = id;
        this.fullName = fullName;
        this.age = age;
        this.enrollmentState = enrollmentState;
        this.parentId = parentId;
    }
}
