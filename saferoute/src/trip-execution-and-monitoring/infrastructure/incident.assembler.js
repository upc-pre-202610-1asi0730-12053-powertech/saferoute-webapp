import { Incident } from "../domain/model/incident.entity.js";

/**
 * Maps incident resources into domain classes.
 * Defined in trip.infrastructure (vue-saferoute-trip.puml).
 * @class IncidentAssembler
 */
export class IncidentAssembler {
    static toEntityFromResource(resource) {
        return new Incident({ ...resource });
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array
            ? response.data
            : response.data['incidents'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
