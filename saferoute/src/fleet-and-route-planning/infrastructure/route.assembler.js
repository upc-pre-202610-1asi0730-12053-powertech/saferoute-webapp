import {Route} from "../domain/model/route.entity.js";

/**
 * Maps fleet-and-route-planning resources into domain entities.
 *
 * @class RouteAssembler
 */
export class RouteAssembler {
    /**
     * @param {Object} resource - Route resource payload.
     * @returns {Route} Route entity.
     */
    static toEntityFromResource(resource) {
        return new Route({...resource})
    }

    /**
     * Parses fleet-and-route-planning resources from a response and maps them into entities.
     *
     * @param {import('axios').AxiosResponse<Array<Object>|Object>} response - HTTP response with fleet-and-route-planning resources.
     * @returns {Route[]} Route entities.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        let resources = response.data instanceof Array ? response.data : response.data['routes'] || [response.data];

        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
