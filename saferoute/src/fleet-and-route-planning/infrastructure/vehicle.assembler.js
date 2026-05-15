import { Vehicle } from "../domain/model/vehicle.entity.js";

/**
 * Maps vehicle resources into domain classes.
 * Defined in fleet.infrastructure (vue-saferoute-fleet.puml).
 *
 * @class VehicleAssembler
 */
export class VehicleAssembler {
    /**
     * @param {Object} resource - Vehicle resource payload.
     * @returns {Vehicle}
     */
    static toEntityFromResource(resource) {
        return new Vehicle({ ...resource });
    }

    /**
     * @param {import('axios').AxiosResponse} response
     * @returns {Vehicle[]}
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data['vehicles'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
