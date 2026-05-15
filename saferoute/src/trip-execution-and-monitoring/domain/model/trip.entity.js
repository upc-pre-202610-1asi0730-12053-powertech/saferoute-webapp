/**
 * Trip class within the Trip bounded context.
 *
 * Defined in trip.domain.model (vue-saferoute-trip.puml).
 * Diagram fields: id, organizationId, routeId, driverId, tripState, startTime, endTime, attendances[], incidents[]
 * Additional fields kept for backward-compatibility with existing views.
 *
 * @class Trip
 */
export class Trip {
    /**
     * @param {Object} params
     */
    constructor({
        id = null, organizationId = null, routeId = null, driverId = null,
        tripState = '', startTime = null, endTime = null,
        attendances = [], incidents = [],
        routeName = '', driverName = '', vehicleId = null, vehiclePlate = '',
        studentIds = [], tripType = '', scheduledDate = '', scheduledStartTime = '',
        status = '', studentsTotal = 0, studentsBoarded = 0,
        currentStop = null, currentLocation = null,
    }) {
        // Diagram fields
        this.id = id;
        this.organizationId = organizationId;
        this.routeId = routeId;
        this.driverId = driverId;
        this.tripState = tripState || status;
        this.startTime = startTime;
        this.endTime = endTime;
        this.attendances = attendances;
        this.incidents = incidents;

        // Backward-compat
        this.routeName = routeName;
        this.driverName = driverName;
        this.vehicleId = vehicleId;
        this.vehiclePlate = vehiclePlate;
        this.studentIds = studentIds;
        this.tripType = tripType;
        this.scheduledDate = scheduledDate;
        this.scheduledStartTime = scheduledStartTime;
        this.status = status || tripState;
        this.studentsTotal = studentsTotal;
        this.studentsBoarded = studentsBoarded;
        this.currentStop = currentStop;
        this.currentLocation = currentLocation;
    }
}
