import { Notification } from "../domain/model/notification.entity.js";

/**
 * Maps notification resources into domain classes.
 * Defined in notifications.infrastructure (vue-saferoute-notifications.puml).
 * @class NotificationAssembler
 */
export class NotificationAssembler {
    static toEntityFromResource(resource) {
        return new Notification({ ...resource });
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array
            ? response.data
            : response.data['notifications'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
