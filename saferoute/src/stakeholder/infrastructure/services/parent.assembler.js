import { Parent } from "../domain/model/parent.entity.js";

/**
 * Maps parent resources into domain classes.
 * Defined in stakeholder.infrastructure (vue-saferoute-stakeholder.puml).
 * @class ParentAssembler
 */
export class ParentAssembler {
    static toEntityFromResource(resource) {
        return new Parent({
            id: resource.id,
            fullName: resource.fullName || resource.name || `${resource.firstName || ''} ${resource.lastName || ''}`.trim(),
            email: resource.email || '',
            phoneNumber: resource.phoneNumber || resource.phone || '',
            organizationId: resource.organizationId || null,
            children: resource.children || [],
        });
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data['parents'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
