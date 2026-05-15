import { Child } from "../domain/model/child.entity.js";

/**
 * Maps child resources into domain classes.
 * Defined in stakeholder.infrastructure (vue-saferoute-stakeholder.puml).
 * @class ChildAssembler
 */
export class ChildAssembler {
    static toEntityFromResource(resource) {
        return new Child({
            id: resource.id,
            fullName: resource.fullName || resource.name || '',
            age: resource.age || 0,
            enrollmentState: resource.enrollmentState || (resource.status === true ? 'ENROLLED' : resource.status === false ? 'WITHDRAWN' : resource.status || ''),
            parentId: resource.parentId || null,
        });
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data['children'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
