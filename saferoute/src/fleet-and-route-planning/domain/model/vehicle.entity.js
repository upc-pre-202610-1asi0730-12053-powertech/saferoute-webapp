/**
 * Vehicle class within the Fleet bounded context.
 *
 * Represents a transport vehicle assigned to an organization.
 * Defined in fleet.domain.model (vue-saferoute-fleet.puml).
 *
 * @class Vehicle
 */
export class Vehicle {
    /**
     * @param {Object} params - Vehicle attributes.
     * @param {?string} [params.id=null] - Vehicle identifier.
     * @param {?string} [params.organizationId=null] - FK of the owning organization.
     * @param {string} [params.plate=''] - License plate number.
     * @param {string} [params.model=''] - Vehicle model.
     * @param {string} [params.brand=''] - Vehicle brand / manufacturer.
     * @param {number} [params.capacity=0] - Passenger capacity.
     */
    constructor({ id = null, organizationId = null, plate = '', model = '', brand = '', capacity = 0 }) {
        this.id = id;
        this.organizationId = organizationId;
        this.plate = plate;
        this.model = model;
        this.brand = brand;
        this.capacity = capacity;
    }
}
