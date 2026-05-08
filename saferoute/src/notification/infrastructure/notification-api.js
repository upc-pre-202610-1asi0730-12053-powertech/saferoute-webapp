import {BaseApi} from "../../shared/infrastructure/base-api.js";
import {BaseEndpoint} from "../../shared/infrastructure/base-endpoint.js";

const endpointPath = import.meta.env.VITE_NOTIFICATION_ENDPOINT_PATH;

/**
 * Infrastructure gateway for Notification bounded-context endpoints.
 *
 * @class NotificationApi
 * @extends BaseApi
 */
export class NotificationApi extends BaseApi {
    #messagesEndpoint;

    constructor() {
        super();
        this.#messagesEndpoint = new BaseEndpoint(this, endpointPath);
    }

    getMessages() { return this.#messagesEndpoint.getAll(); }
    getMessageById(id) { return this.#messagesEndpoint.getById(id); }
    createMessage(resource) { return this.#messagesEndpoint.create(resource); }
    updateMessage(resource) { return this.#messagesEndpoint.update(resource.id, resource); }
    deleteMessage(id) { return this.#messagesEndpoint.delete(id); }
}
