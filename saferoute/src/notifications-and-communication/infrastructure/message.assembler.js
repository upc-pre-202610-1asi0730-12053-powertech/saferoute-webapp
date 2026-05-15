import {Message} from "../domain/model/message.entity.js";

/**
 * Maps message resources into domain entities.
 *
 * @class MessageAssembler
 */
export class MessageAssembler {
    static toEntityFromResource(resource) {
        return new Message({...resource})
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        let resources = response.data instanceof Array ? response.data : response.data['messages'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
