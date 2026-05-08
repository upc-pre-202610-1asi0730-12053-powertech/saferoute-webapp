import {Plan} from "../domain/model/plan.entity.js";

/**
 * Maps plan resources into domain entities.
 *
 * @class PlanAssembler
 */
export class PlanAssembler {
    static toEntityFromResource(resource) {
        return new Plan({...resource})
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200 && response.status !== 201) {
            console.error(`${response.status}, ${response.statusText}`);
            return [];
        }
        let resources = response.data instanceof Array ? response.data : response.data['plans'] || [response.data];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
