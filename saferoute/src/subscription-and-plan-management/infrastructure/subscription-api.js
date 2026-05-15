import {BaseApi} from "../../shared/infrastructure/base-api.js";
import {BaseEndpoint} from "../../shared/infrastructure/base-endpoint.js";

const endpointPath = import.meta.env.VITE_SUBSCRIPTION_ENDPOINT_PATH;

/**
 * Infrastructure gateway for Subscription bounded-context endpoints.
 *
 * @class SubscriptionApi
 * @extends BaseApi
 */
export class SubscriptionApi extends BaseApi {
    #plansEndpoint;

    constructor() {
        super();
        this.#plansEndpoint = new BaseEndpoint(this, endpointPath);
    }

    getPlans() { return this.#plansEndpoint.getAll(); }
    getPlanById(id) { return this.#plansEndpoint.getById(id); }
    createPlan(resource) { return this.#plansEndpoint.create(resource); }
    updatePlan(resource) { return this.#plansEndpoint.update(resource.id, resource); }
    deletePlan(id) { return this.#plansEndpoint.delete(id); }
}
