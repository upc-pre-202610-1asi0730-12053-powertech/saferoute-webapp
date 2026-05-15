import { Stop } from "../domain/model/stop.entity.js";

/**
 * Maps stop resources into domain classes.
 * Defined in fleet.infrastructure (vue-saferoute-fleet.puml).
 *
 * @class StopAssembler
 */
export class StopAssembler {
    /**
     * @param {Object} resource - Stop resource payload.
     * @returns {Stop}
     */
    static toEntityFromResource(resource) {
        return new Stop({ ...resource });
    }

    /**
     * @param {import('axios').AxiosResponse} response
     * @returns {Stop[]}
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data['stops'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
