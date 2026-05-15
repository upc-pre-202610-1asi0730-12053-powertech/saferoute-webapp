import {Trip} from "../domain/model/trip.entity.js";

/**
 * Maps trip resources into domain entities.
 *
 * @class TripAssembler
 */
export class TripAssembler {
    static toEntityFromResource(resource) {
        return new Trip({...resource})
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        let resources = response.data instanceof Array ? response.data : response.data['trips'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
