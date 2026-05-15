/**
 * Plan tier constants for SafeRoute subscriptions.
 * @readonly
 * @enum {string}
 */
export const PlanTier = Object.freeze({
    BASIC:        'BASIC',
    INTERMEDIATE: 'INTERMEDIATE',
    COMPLETE:     'COMPLETE'
});

/**
 * Plan entity within the Subscription bounded context.
 *
 * @class Plan
 */
export class Plan {
    /**
     * @param {Object} params - Entity attributes.
     * @param {?string} [params.id=null] - Plan identifier.
     * @param {string} [params.planTier=''] - Plan tier ('BASIC' | 'INTERMEDIATE' | 'COMPLETE').
     * @param {number} [params.maxRoutes=0] - Maximum number of routes allowed by the plan.
     * @param {number} [params.maxDrivers=0] - Maximum number of drivers allowed by the plan.
     * @param {number} [params.price=0] - Monthly price (PEN).
     */
    constructor({ id = null, planTier = '', maxRoutes = 0, maxDrivers = 0, price = 0 }) {
        this.id = id;
        this.planTier = planTier;
        this.maxRoutes = maxRoutes;
        this.maxDrivers = maxDrivers;
        this.price = price;
    }

    /** @returns {boolean} */
    isBasic()        { return this.planTier === PlanTier.BASIC; }
    /** @returns {boolean} */
    isIntermediate() { return this.planTier === PlanTier.INTERMEDIATE; }
    /** @returns {boolean} */
    isComplete()     { return this.planTier === PlanTier.COMPLETE; }
}
