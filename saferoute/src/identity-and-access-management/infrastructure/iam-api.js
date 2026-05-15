import {BaseApi} from "../../shared/infrastructure/base-api.js";
import {BaseEndpoint} from "../../shared/infrastructure/base-endpoint.js";

const endpointPath = '/users';

/**
 * Infrastructure gateway for IAM bounded-context endpoints.
 *
 * @class IamApi
 * @extends BaseApi
 */
export class IamApi extends BaseApi {
    #usersEndpoint;

    constructor() {
        super();
        this.#usersEndpoint = new BaseEndpoint(this, endpointPath);
    }

    getUsers() { return this.#usersEndpoint.getAll(); }
    getUserById(id) { return this.#usersEndpoint.getById(id); }
    createUser(resource) { return this.#usersEndpoint.create(resource); }
    updateUser(resource) { return this.#usersEndpoint.update(resource.id, resource); }
    deleteUser(id) { return this.#usersEndpoint.delete(id); }
}
