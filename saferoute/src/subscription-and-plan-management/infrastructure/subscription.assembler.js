import { Subscription } from "../domain/model/subscription.entity.js";

/**
 * Maps subscription-and-plan-management resources into domain entities.
 *
 * @class SubscriptionAssembler
 */
export class SubscriptionAssembler {
    /**
     * @param {Object} resource - Subscription resource payload.
     * @returns {Subscription} Subscription entity.
     */
    static toEntityFromResource(resource) {
        return new Subscription({ ...resource });
    }

    /**
     * Parses subscription-and-plan-management resources from a response and maps them into entities.
     *
     * @param {import('axios').AxiosResponse<Array<Object>|Object>} response - HTTP response with subscription-and-plan-management resources.
     * @returns {Subscription[]} Subscription entities.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data['subscriptions'] || [];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
