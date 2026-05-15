import { StudentGroup } from "../domain/model/student-group.entity.js";

/**
 * Maps student group resources into domain classes.
 * Defined in stakeholder.infrastructure (vue-saferoute-stakeholder.puml).
 * @class StudentGroupAssembler
 */
export class StudentGroupAssembler {
    static toEntityFromResource(resource) {
        return new StudentGroup({ ...resource });
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data['groups'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
