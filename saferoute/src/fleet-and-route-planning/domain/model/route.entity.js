/**
 * Route class within the Fleet bounded context.
 *
 * Defined in fleet.domain.model (vue-saferoute-fleet.puml).
 * Fields from diagram: id, name, organizationId, routeState, departureTime, serviceDays[], vehicleId.
 * Additional fields kept for backward-compatibility with existing views.
 *
 * @class Route
 */
export class Route {
    /**
     * @param {Object} params - Route attributes.
     * @param {?string} [params.id=null] - Route identifier.
     * @param {string} [params.name=''] - Route name.
     * @param {?string} [params.organizationId=null] - FK of the owning organization.
     * @param {string} [params.routeState=''] - Route lifecycle state.
     * @param {string} [params.departureTime=''] - Scheduled departure time.
     * @param {string[]} [params.serviceDays=[]] - Days of service (e.g. ['MON','TUE']).
     * @param {?string} [params.vehicleId=null] - FK of the assigned vehicle.
     *
     * Backward-compatible fields used by existing views:
     * @param {string} [params.origin=''] - Route origin name.
     * @param {string} [params.destination=''] - Route destination name.
     * @param {string} [params.type=''] - Route type (OUTBOUND/RETURN).
     * @param {?string} [params.driverId=null] - Assigned driver ID.
     * @param {string} [params.driverName=''] - Assigned driver display name.
     * @param {string} [params.vehiclePlate=''] - Vehicle plate.
     * @param {string[]} [params.studentIds=[]] - Assigned student IDs.
     * @param {string} [params.scheduledStartTime=''] - Scheduled start time.
     * @param {string} [params.status=''] - Status string.
     * @param {Array} [params.waypoints=[]] - Waypoint data.
     * @param {number} [params.stops=0] - Number of stops.
     */
    constructor({
                    id = null,
                    name = '',
                    organizationId = null,
                    routeState = '',
                    departureTime = '',
                    serviceDays = [],
                    vehicleId = null,
                    origin = '',
                    destination = '',
                    type = '',
                    driverId = null,
                    driverName = '',
                    vehiclePlate = '',
                    studentIds = [],
                    scheduledStartTime = '',
                    status = '',
                    waypoints = [],
                    stops = 0,
                }) {
        // Diagram fields
        this.id = id;
        this.name = name;
        this.organizationId = organizationId;
        this.routeState = routeState || status;
        this.departureTime = departureTime || scheduledStartTime;
        this.serviceDays = serviceDays;
        this.vehicleId = vehicleId;

        // Backward-compatible fields (used by existing views)
        this.origin = origin;
        this.destination = destination;
        this.type = type;
        this.driverId = driverId;
        this.driverName = driverName;
        this.vehiclePlate = vehiclePlate;
        this.studentIds = studentIds;
        this.scheduledStartTime = scheduledStartTime || departureTime;
        this.status = status || routeState;
        this.waypoints = waypoints;
        this.stops = stops;
    }
}
