import {Profile} from "../domain/model/profile.entity.js";

/**
 * Maps stakeholder profile resources into domain entities.
 *
 * @class ProfileAssembler
 */
export class ProfileAssembler {
    /**
     * @param {Object} resource - Profile resource payload.
     * @returns {Profile} Profile entity.
     */
    static toEntityFromResource(resource) {
        return new Profile({...resource})
    }

    /**
     * Parses profile resources from a response and maps them into entities.
     *
     * @param {import('axios').AxiosResponse<Array<Object>|Object>} response - HTTP response with profile resources.
     * @returns {Profile[]} Profile entities.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        let resources = response.data instanceof Array ? response.data : response.data['profiles'] || [response.data];

        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
