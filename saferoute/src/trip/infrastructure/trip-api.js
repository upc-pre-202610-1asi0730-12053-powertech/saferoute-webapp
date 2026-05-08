import {BaseApi} from "../../shared/infrastructure/base-api.js";
import {BaseEndpoint} from "../../shared/infrastructure/base-endpoint.js";

const endpointPath = import.meta.env.VITE_TRIP_ENDPOINT_PATH;

/**
 * Infrastructure gateway for Trip bounded-context endpoints.
 *
 * @class TripApi
 * @extends BaseApi
 */
export class TripApi extends BaseApi {
    #tripsEndpoint;

    constructor() {
        super();
        this.#tripsEndpoint = new BaseEndpoint(this, endpointPath);
    }

    getTrips() { return this.#tripsEndpoint.getAll(); }
    getTripById(id) { return this.#tripsEndpoint.getById(id); }
    createTrip(resource) { return this.#tripsEndpoint.create(resource); }
    updateTrip(resource) { return this.#tripsEndpoint.update(resource.id, resource); }
    deleteTrip(id) { return this.#tripsEndpoint.delete(id); }
}
