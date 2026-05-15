/**
 * Application service store for the Subscription bounded context.
 * Coordinates plan catalog and per-organization subscription-and-plan-management use cases.
 *
 * @module useSubscriptionStore
 */
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { SubscriptionApi } from "../infrastructure/subscription-api.js";
import { PlanAssembler } from "../infrastructure/plan.assembler.js";
import { SubscriptionAssembler } from "../infrastructure/subscription.assembler.js";

const subscriptionApi = new SubscriptionApi();

const DEFAULT_DURATION_DAYS = 30;

/**
 * Reactive store that exposes Subscription commands and queries.
 * @returns {Object} Store state and actions.
 */
export const useSubscriptionStore = defineStore('subscription', () => {
    /** @type {import('vue').Ref<import('../domain/model/plan.entity.js').Plan[]>} */
    const plans = ref([]);
    /** @type {import('vue').Ref<?import('../domain/model/subscription.entity.js').Subscription>} */
    const subscription = ref(null);
    /** @type {import('vue').Ref<Error[]>} */
    const errors = ref([]);
    /** @type {import('vue').Ref<boolean>} */
    const plansLoaded = ref(false);
    /** @type {import('vue').Ref<boolean>} */
    const subscriptionLoaded = ref(false);
    /** @type {import('vue').Ref<boolean>} */
    const loading = ref(false);

    /** @type {import('vue').ComputedRef<number>} */
    const plansCount = computed(() => plansLoaded.value ? plans.value.length : 0);

    /** @type {import('vue').ComputedRef<?import('../domain/model/plan.entity.js').Plan>} */
    const currentPlan = computed(() => {
        if (!subscription.value) return null;
        return plans.value.find(p => p.id === subscription.value.planId) || null;
    });

    // ─── Plan actions ────────────────────────────────────────────────────────

    /** Loads all available plans. */
    async function loadPlans() {
        loading.value = true;
        try {
            const response = await subscriptionApi.getAllPlans();
            plans.value = PlanAssembler.toEntitiesFromResponse(response);
            plansLoaded.value = true;
        } catch (error) {
            errors.value.push(error);
        } finally {
            loading.value = false;
        }
    }

    /**
     * @param {string|number} id
     * @returns {?import('../domain/model/plan.entity.js').Plan}
     */
    function getPlanById(id) {
        return plans.value.find(p => String(p.id) === String(id)) || null;
    }

    // ─── Subscription actions ────────────────────────────────────────────────

    /**
     * Loads the subscription-and-plan-management for the given organization.
     * @param {string|number} organizationId
     */
    async function loadSubscription(organizationId) {
        loading.value = true;
        try {
            const response = await subscriptionApi.getSubscriptionByOrganization(organizationId);
            const list = SubscriptionAssembler.toEntitiesFromResponse(response);
            subscription.value = list.length > 0 ? list[0] : null;
            subscriptionLoaded.value = true;
        } catch (error) {
            errors.value.push(error);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Creates a subscription-and-plan-management for an organization.
     * @param {Object} request - { organizationId, planId, startDate?, endDate? }
     * @returns {Promise<?import('../domain/model/subscription.entity.js').Subscription>}
     */
    async function createSubscription(request) {
        loading.value = true;
        try {
            const startDate = request.startDate || new Date().toISOString();
            const endDate = request.endDate || (() => {
                const d = new Date();
                d.setDate(d.getDate() + DEFAULT_DURATION_DAYS);
                return d.toISOString();
            })();
            const payload = {
                organizationId: request.organizationId,
                planId: request.planId,
                state: 'ACTIVE',
                startDate,
                endDate
            };
            const response = await subscriptionApi.createSubscription(payload);
            const created = SubscriptionAssembler.toEntityFromResource(response.data);
            subscription.value = created;
            return created;
        } catch (error) {
            errors.value.push(error);
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Upgrades the current subscription-and-plan-management to a different plan.
     * @param {string|number} id - Subscription id.
     * @param {string|number} planId - Target plan id.
     */
    async function upgradeSubscription(id, planId) {
        loading.value = true;
        try {
            const response = await subscriptionApi.upgradeSubscription(id, planId);
            subscription.value = SubscriptionAssembler.toEntityFromResource(response.data);
        } catch (error) {
            errors.value.push(error);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Cancels the subscription-and-plan-management with the given id.
     * @param {string|number} id
     */
    async function cancelSubscription(id) {
        loading.value = true;
        try {
            const response = await subscriptionApi.cancelSubscription(id);
            subscription.value = SubscriptionAssembler.toEntityFromResource(response.data);
        } catch (error) {
            errors.value.push(error);
        } finally {
            loading.value = false;
        }
    }

    return {
        // state
        plans, subscription, errors, plansLoaded, subscriptionLoaded, loading,
        // getters
        plansCount, currentPlan,
        // actions
        loadPlans, getPlanById, loadSubscription, createSubscription, upgradeSubscription, cancelSubscription
    };
});

export default useSubscriptionStore;
