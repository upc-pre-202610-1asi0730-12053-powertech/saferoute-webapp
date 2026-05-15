import { Announcement } from "../domain/model/announcement.entity.js";

/**
 * Maps announcement resources into domain classes.
 * Defined in notifications.infrastructure (vue-saferoute-notifications.puml).
 * @class AnnouncementAssembler
 */
export class AnnouncementAssembler {
    static toEntityFromResource(resource) {
        return new Announcement({ ...resource });
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array
            ? response.data
            : response.data['announcements'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
