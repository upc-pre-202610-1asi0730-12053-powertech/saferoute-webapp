/**
 * Stop class within the Fleet bounded context.
 *
 * Represents a stop along a route with geographic coordinates.
 * Defined in fleet.domain.model (vue-saferoute-fleet.puml).
 *
 * @class Stop
 */
export class Stop {
    /**
     * @param {Object} params - Stop attributes.
     * @param {?string} [params.id=null] - Stop identifier.
     * @param {?string} [params.routeId=null] - FK of the parent route.
     * @param {string} [params.name=''] - Stop name / address.
     * @param {number} [params.latitude=0] - Latitude coordinate.
     * @param {number} [params.longitude=0] - Longitude coordinate.
     * @param {number} [params.stopOrder=0] - Order within the route.
     */
    constructor({ id = null, routeId = null, name = '', latitude = 0, longitude = 0, stopOrder = 0 }) {
        this.id = id;
        this.routeId = routeId;
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
        this.stopOrder = stopOrder;
    }
}
