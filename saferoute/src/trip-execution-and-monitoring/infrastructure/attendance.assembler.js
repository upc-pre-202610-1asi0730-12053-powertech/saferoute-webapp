import { Attendance } from "../domain/model/attendance.entity.js";

/**
 * Maps attendance resources into domain classes.
 * Defined in trip.infrastructure (vue-saferoute-trip.puml).
 * @class AttendanceAssembler
 */
export class AttendanceAssembler {
    static toEntityFromResource(resource) {
        return new Attendance({ ...resource });
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array
            ? response.data
            : response.data['attendances'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
