import { User } from "../domain/model/user.entity.js";

/**
 * Maps user resources into domain entities.
 *
 * @class UserAssembler
 */
export class UserAssembler {
    /**
     * @param {Object} resource - User resource payload.
     * @returns {User} User entity.
     */
    static toEntityFromResource(resource) {
        return new User({ ...resource });
    }

    /**
     * Parses user resources from a response and maps them into entities.
     *
     * @param {import('axios').AxiosResponse<Array<Object>|Object>} response - HTTP response with user resources.
     * @returns {User[]} User entities.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data['users'] || [];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
