import { Alert } from "../domain/model/alert.entity.js";

/**
 * Maps alert resources into domain classes.
 * Defined in notifications.infrastructure (vue-saferoute-notifications.puml).
 * @class AlertAssembler
 */
export class AlertAssembler {
    static toEntityFromResource(resource) {
        return new Alert({ ...resource });
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array
            ? response.data
            : response.data['alerts'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
