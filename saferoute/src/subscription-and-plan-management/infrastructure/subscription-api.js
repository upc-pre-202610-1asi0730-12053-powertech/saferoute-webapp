import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";
import seedData from '../../server/db.json';

const useFakeAuth = import.meta.env.VITE_USE_FAKE_AUTH === 'true';
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
        const newSub = { ...request, state: 'ACTIVE' };
        try {
            // Try to persist in json-server (real db.json)
            // Cancel any existing active sub for this org first (best-effort)
            const res = await this.http.get(`${subscriptionsEndpointPath}?organizationId=${request.organizationId}&state=ACTIVE`).catch(() => ({ data: [] }));
            const active = Array.isArray(res.data) ? res.data : [];
            await Promise.all(active.map(s =>
                this.http.patch(`${subscriptionsEndpointPath}/${s.id}`, { state: 'CANCELLED' }).catch(() => {})
            ));
            const created = await this.#subscriptionsEndpoint.create(newSub);
            return created;
        } catch {
            
            const list = JSON.parse(localStorage.getItem(MOCK_SUBS_KEY) || '[]')
                .map(s => s.organizationId === request.organizationId ? { ...s, state: 'CANCELLED' } : s);
            const fallback = { id: `sub-${Date.now()}`, ...newSub };
            list.push(fallback);
            localStorage.setItem(MOCK_SUBS_KEY, JSON.stringify(list));
            return { status: 201, data: fallback };
        }
    }

    getSubscriptionByOrganization(organizationId) {
        // Try real server first, fall back to localStorage
        return this.http.get(`${subscriptionsEndpointPath}?organizationId=${organizationId}&state=ACTIVE`)
            .catch(() => {
                const active = mockSubs().filter(s => s.organizationId === organizationId && s.state === 'ACTIVE');
                return { status: 200, data: active };
            });
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
        return this.http.patch(`${subscriptionsEndpointPath}/${id}`, { planId });
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
        return this.http.patch(`${subscriptionsEndpointPath}/${id}`, { state: 'CANCELLED' });
    }
}
