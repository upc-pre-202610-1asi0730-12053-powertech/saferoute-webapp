import {BaseApi} from "../../shared/infrastructure/base-api.js";
import {BaseEndpoint} from "../../shared/infrastructure/base-endpoint.js";

const endpointPath = import.meta.env.VITE_STAKEHOLDER_ENDPOINT_PATH;

/**
 * Infrastructure gateway for Stakeholder bounded-context endpoints.
 *
 * @class StakeholderApi
 * @extends BaseApi
 */
export class StakeholderApi extends BaseApi {
    /**
     * @type {BaseEndpoint}
     * @private
     */
    #profilesEndpoint;

    /** Creates endpoint clients for profiles. */
    constructor() {
        super();
        this.#profilesEndpoint = new BaseEndpoint(this, endpointPath);
    }

    getProfiles() {
        return this.#profilesEndpoint.getAll();
    }

    getProfileById(id) {
        return this.#profilesEndpoint.getById(id);
    }

    createProfile(resource) {
        return this.#profilesEndpoint.create(resource);
    }

    updateProfile(resource) {
        return this.#profilesEndpoint.update(resource.id, resource);
    }

    deleteProfile(id) {
        return this.#profilesEndpoint.delete(id);
    }
}
