import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";
import seedData from '../../server/db.json';

const useFakeAuth = String(import.meta.env.VITE_USE_FAKE_AUTH).toLowerCase() === 'true';
const MOCK_SUBS_KEY = 'saferoute.mock.subscriptions';

function mockPlans() { return seedData.plans; }
function mockSubs() {
    const extra = JSON.parse(localStorage.getItem(MOCK_SUBS_KEY) || '[]');
    return [...seedData.subscriptions, ...extra];
}

const plansEndpointPath         = import.meta.env.VITE_PLANS_ENDPOINT_PATH         || '/plans';
const subscriptionsEndpointPath = import.meta.env.VITE_SUBSCRIPTIONS_ENDPOINT_PATH || '/subscriptions';

/**
 * Infrastructure gateway for Subscription bounded-context endpoints.
 *
 * @class SubscriptionApi
 * @extends BaseApi
 */
export class SubscriptionApi extends BaseApi {
    /** @type {BaseEndpoint} @private */
    #plansEndpoint;
    /** @type {BaseEndpoint} @private */
    #subscriptionsEndpoint;

    constructor() {
        super();
        this.#plansEndpoint = new BaseEndpoint(this, plansEndpointPath);
        this.#subscriptionsEndpoint = new BaseEndpoint(this, subscriptionsEndpointPath);
    }

    // ─── Plans ───────────────────────────────────────────────────────────────

    getAllPlans() {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockPlans() });
        return this.#plansEndpoint.getAll();
    }

    getPlanById(id) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockPlans().find(p => p.id === id) || null });
        return this.#plansEndpoint.getById(id);
    }

    // ─── Subscriptions ───────────────────────────────────────────────────────

    async createSubscription(request) {
        const newSub = {
            organizationId: request.organizationId,
            planId: request.planId,
            startDate: request.startDate,
            endDate: request.endDate,
        };

        if (!useFakeAuth) return this.#subscriptionsEndpoint.create(newSub);

        const list = JSON.parse(localStorage.getItem(MOCK_SUBS_KEY) || '[]')
            .map(s => s.organizationId === request.organizationId ? { ...s, state: 'CANCELLED' } : s);
        const fallback = { id: `sub-${Date.now()}`, ...newSub, state: 'ACTIVE' };
        list.push(fallback);
        localStorage.setItem(MOCK_SUBS_KEY, JSON.stringify(list));
        return { status: 201, data: fallback };
    }

    async getSubscriptionByOrganization(organizationId) {
        if (useFakeAuth) {
            const active = mockSubs().filter(s => s.organizationId === organizationId && s.state === 'ACTIVE');
            return { status: 200, data: active };
        }
        const response = await this.http.get(`${subscriptionsEndpointPath}?organizationId=${organizationId}`);
        return {
            ...response,
            data: (response.data || []).filter(subscription => subscription.state === 'ACTIVE'),
        };
    }

    upgradeSubscription(id, planId) {
        if (useFakeAuth) {
            const list = mockSubs();
            const idx  = list.findIndex(s => s.id === id);
            if (idx !== -1) {
                list[idx] = { ...list[idx], planId };
                const extra = list.filter(s => !seedData.subscriptions.find(x => x.id === s.id));
                localStorage.setItem(MOCK_SUBS_KEY, JSON.stringify(extra));
                return Promise.resolve({ status: 200, data: list[idx] });
            }
        }
        return this.http.put(`${subscriptionsEndpointPath}/${id}/plan`, { planId });
    }

    cancelSubscription(id) {
        if (useFakeAuth) {
            const list = mockSubs();
            const idx  = list.findIndex(s => s.id === id);
            if (idx !== -1) {
                list[idx] = { ...list[idx], state: 'CANCELLED' };
                const extra = list.filter(s => !seedData.subscriptions.find(x => x.id === s.id));
                localStorage.setItem(MOCK_SUBS_KEY, JSON.stringify(extra));
                return Promise.resolve({ status: 200, data: list[idx] });
            }
        }
        return this.http.post(`${subscriptionsEndpointPath}/${id}/cancel`);
    }
}
