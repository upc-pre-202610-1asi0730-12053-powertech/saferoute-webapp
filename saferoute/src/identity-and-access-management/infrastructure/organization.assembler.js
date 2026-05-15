import { Organization } from "../domain/model/organization.entity.js";

/**
 * Maps organization resources into domain entities.
 *
 * @class OrganizationAssembler
 */
export class OrganizationAssembler {
    /**
     * @param {Object} resource - Organization resource payload.
     * @returns {Organization} Organization entity.
     */
    static toEntityFromResource(resource) {
        return new Organization({ ...resource });
    }

    /**
     * Parses organization resources from a response and maps them into entities.
     *
     * @param {import('axios').AxiosResponse<Array<Object>|Object>} response - HTTP response with organization resources.
     * @returns {Organization[]} Organization entities.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data['organizations'] || [];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
