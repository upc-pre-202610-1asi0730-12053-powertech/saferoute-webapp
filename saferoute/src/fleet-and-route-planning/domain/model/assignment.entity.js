/**
 * Assignment class within the Fleet bounded context.
 *
 * Links a route to a driver and a set of children.
 * Defined in fleet.domain.model (vue-saferoute-fleet.puml).
 *
 * @class Assignment
 */
export class Assignment {
    /**
     * @param {Object} params - Assignment attributes.
     * @param {?string} [params.id=null] - Assignment identifier.
     * @param {?string} [params.routeId=null] - FK of the associated route.
     * @param {?string} [params.driverId=null] - FK of the assigned driver.
     * @param {string[]} [params.childIds=[]] - List of assigned child identifiers.
     */
    constructor({ id = null, routeId = null, driverId = null, childIds = [] }) {
        this.id = id;
        this.routeId = routeId;
        this.driverId = driverId;
        this.childIds = childIds;
    }
}
