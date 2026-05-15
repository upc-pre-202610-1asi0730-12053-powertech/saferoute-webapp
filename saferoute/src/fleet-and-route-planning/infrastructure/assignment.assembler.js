import { Assignment } from "../domain/model/assignment.entity.js";

/**
 * Maps assignment resources into domain classes.
 * Defined in fleet.infrastructure (vue-saferoute-fleet.puml).
 *
 * @class AssignmentAssembler
 */
export class AssignmentAssembler {
    /**
     * @param {Object} resource - Assignment resource payload.
     * @returns {Assignment}
     */
    static toEntityFromResource(resource) {
        return new Assignment({ ...resource });
    }
}
