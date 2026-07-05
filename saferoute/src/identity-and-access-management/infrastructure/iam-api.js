import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";

const usersEndpointPath         = import.meta.env.VITE_USERS_ENDPOINT_PATH         || '/users';
const organizationsEndpointPath = import.meta.env.VITE_ORGANIZATIONS_ENDPOINT_PATH || '/organizations';
const signInEndpointPath        = import.meta.env.VITE_SIGN_IN_ENDPOINT_PATH       || '/users/sign-in';
const signUpEndpointPath        = import.meta.env.VITE_SIGN_UP_ENDPOINT_PATH       || '/users';

/**
 * Infrastructure gateway for IAM bounded-context endpoints against the real backend.
 *
 * @class IamApi
 * @extends BaseApi
 */
export class IamApi extends BaseApi {
    #usersEndpoint;
    #organizationsEndpoint;

    constructor() {
        super();
        this.#usersEndpoint        = new BaseEndpoint(this, usersEndpointPath);
        this.#organizationsEndpoint = new BaseEndpoint(this, organizationsEndpointPath);
    }

    signIn(email, password) {
        return this.http.post(signInEndpointPath, { email, password });
    }

    registerUser(request) {
        return this.http.post(signUpEndpointPath, request);
    }

    getUsers() {
        return this.#usersEndpoint.getAll();
    }

    getUserById(id) {
        return this.#usersEndpoint.getById(id);
    }

    createOrganization(request) {
        return this.#organizationsEndpoint.create({ name: request.name });
    }

    getOrganizationById(id) {
        return this.#organizationsEndpoint.getById(id);
    }

    updateOrganization(resource) {
        return this.#organizationsEndpoint.update(resource.id, resource);
    }
}
