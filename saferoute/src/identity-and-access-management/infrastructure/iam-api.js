import axios from "axios";
import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";

const usersEndpointPath         = import.meta.env.VITE_USERS_ENDPOINT_PATH         || '/users';
const organizationsEndpointPath = import.meta.env.VITE_ORGANIZATIONS_ENDPOINT_PATH || '/organizations';
const signInEndpointPath        = import.meta.env.VITE_SIGN_IN_ENDPOINT_PATH       || '/users/sign-in';
const signUpEndpointPath        = import.meta.env.VITE_SIGN_UP_ENDPOINT_PATH       || '/users';

const useFakeIam = String(import.meta.env.VITE_USE_FAKE_IAM).toLowerCase() === 'true';
const iamApiBaseUrl = import.meta.env.VITE_IAM_API_BASE_URL || 'http://localhost:3000';

/**
 * Infrastructure gateway for IAM bounded-context endpoints.
 * When VITE_USE_FAKE_IAM=true, IAM runs against json-server while the rest of
 * the application can keep using the real backend.
 *
 * @class IamApi
 * @extends BaseApi
 */
export class IamApi extends BaseApi {
    #usersEndpoint;
    #organizationsEndpoint;
    #iamHttp;

    constructor() {
        super();
        this.#usersEndpoint        = new BaseEndpoint(this, usersEndpointPath);
        this.#organizationsEndpoint = new BaseEndpoint(this, organizationsEndpointPath);
        this.#iamHttp = axios.create({
            baseURL: iamApiBaseUrl,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    signIn(email, password) {
        if (useFakeIam) {
            return this.#iamHttp.get(usersEndpointPath, { params: { email, password } });
        }
        return this.http.post(signInEndpointPath, { email, password });
    }

    registerUser(request) {
        if (useFakeIam) {
            return this.#iamHttp.post(usersEndpointPath, request);
        }
        return this.http.post(signUpEndpointPath, request);
    }

    getUsers() {
        if (useFakeIam) return this.#iamHttp.get(usersEndpointPath);
        return this.#usersEndpoint.getAll();
    }

    getUserById(id) {
        if (useFakeIam) return this.#iamHttp.get(`${usersEndpointPath}/${id}`);
        return this.#usersEndpoint.getById(id);
    }

    createOrganization(request) {
        if (useFakeIam) {
            return this.#iamHttp.post(organizationsEndpointPath, request);
        }
        return this.#organizationsEndpoint.create({ name: request.name });
    }

    getOrganizationById(id) {
        if (useFakeIam) return this.#iamHttp.get(`${organizationsEndpointPath}/${id}`);
        return this.#organizationsEndpoint.getById(id);
    }

    updateOrganization(resource) {
        if (useFakeIam) {
            return this.#iamHttp.put(`${organizationsEndpointPath}/${resource.id}`, resource);
        }
        return this.#organizationsEndpoint.update(resource.id, resource);
    }
}
