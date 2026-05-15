import { Driver } from "../domain/model/driver.entity.js";

/**
 * Maps driver resources into domain classes.
 * Defined in stakeholder.infrastructure (vue-saferoute-stakeholder.puml).
 * @class DriverAssembler
 */
export class DriverAssembler {
    static toEntityFromResource(resource) {
        return new Driver({
            id: resource.id,
            fullName: resource.fullName || resource.name || `${resource.firstName || ''} ${resource.lastName || ''}`.trim(),
            email: resource.email || '',
            phoneNumber: resource.phoneNumber || resource.phone || '',
            licenseNumber: resource.licenseNumber || resource.license || '',
            organizationId: resource.organizationId || null,
        });
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data['drivers'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
