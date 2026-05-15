import { Plan } from "../domain/model/plan.entity.js";

/**
 * Maps plan resources into domain entities.
 *
 * @class PlanAssembler
 */
export class PlanAssembler {
    /**
     * @param {Object} resource - Plan resource payload.
     * @returns {Plan} Plan entity.
     */
    static toEntityFromResource(resource) {
        return new Plan({ ...resource });
    }

    /**
     * Parses plan resources from a response and maps them into entities.
     *
     * @param {import('axios').AxiosResponse<Array<Object>|Object>} response - HTTP response with plan resources.
     * @returns {Plan[]} Plan entities.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data['plans'] || [];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
