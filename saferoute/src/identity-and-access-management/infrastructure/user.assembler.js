import {User} from "../domain/model/user.entity.js";

/**
 * Maps user resources into domain entities.
 *
 * @class UserAssembler
 */
export class UserAssembler {
    static toEntityFromResource(resource) {
        return new User({...resource})
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        let resources = response.data instanceof Array ? response.data : response.data['users'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
