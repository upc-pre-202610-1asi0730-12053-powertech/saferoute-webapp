import {BaseApi} from "../../shared/infrastructure/base-api.js";
import {BaseEndpoint} from "../../shared/infrastructure/base-endpoint.js";

const endpointPath = import.meta.env.VITE_ROUTE_ENDPOINT_PATH;

/**
 * Infrastructure gateway for Route bounded-context endpoints.
 *
 * @class RouteApi
 * @extends BaseApi
 */
export class RouteApi extends BaseApi {
    /**
     * @type {BaseEndpoint}
     * @private
     */
    #routesEndpoint;

    /** Creates endpoint clients for routes. */
    constructor() {
        super();
        this.#routesEndpoint = new BaseEndpoint(this, endpointPath);
    }

    getRoutes() {
        return this.#routesEndpoint.getAll();
    }

    getRouteById(id) {
        return this.#routesEndpoint.getById(id);
    }

    createRoute(resource) {
        return this.#routesEndpoint.create(resource);
    }

    updateRoute(resource) {
        return this.#routesEndpoint.update(resource.id, resource);
    }

    deleteRoute(id) {
        return this.#routesEndpoint.delete(id);
    }
}
