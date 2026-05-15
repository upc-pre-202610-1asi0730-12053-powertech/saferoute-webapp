import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";
import seedData from '../../server/db.json';

const usersEndpointPath         = import.meta.env.VITE_USERS_ENDPOINT_PATH         || '/users';
const organizationsEndpointPath = import.meta.env.VITE_ORGANIZATIONS_ENDPOINT_PATH || '/organizations';
const signInEndpointPath        = import.meta.env.VITE_SIGN_IN_ENDPOINT_PATH       || '/authentication/sign-in';
const signUpEndpointPath        = import.meta.env.VITE_SIGN_UP_ENDPOINT_PATH       || '/authentication/sign-up';

const useFakeAuth = String(import.meta.env.VITE_USE_FAKE_AUTH).toLowerCase() === 'true';

// ── Mock helpers (localStorage-backed, no server needed) ─────────────────────

const MOCK_USERS_KEY = 'saferoute.mock.users';
const MOCK_ORGS_KEY  = 'saferoute.mock.orgs';

function mockUsers() {
    const extra = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
    return [...seedData.users, ...extra];
}

function mockOrgs() {
    const extra = JSON.parse(localStorage.getItem(MOCK_ORGS_KEY) || '[]');
    return [...seedData.organizations, ...extra];
}

function saveMockUser(user) {
    const extra = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
    extra.push(user);
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(extra));
    return user;
}

function saveMockOrg(org) {
    const extra = JSON.parse(localStorage.getItem(MOCK_ORGS_KEY) || '[]');
    extra.push(org);
    localStorage.setItem(MOCK_ORGS_KEY, JSON.stringify(extra));
    return org;
}

/**
 * Infrastructure gateway for IAM bounded-context endpoints.
 * When VITE_USE_FAKE_AUTH=true all operations run in-memory (localStorage + seed
 * data) — no running server is required. Set to false to target the real backend.
 *
 * @class IamApi
 * @extends BaseApi
 */
export class IamApi extends BaseApi {
    #usersEndpoint;
    #organizationsEndpoint;

    constructor() {
        super();
        this.#usersEndpoint        = new BaseEndpoint(this, usersEndpointPath);
        this.#organizationsEndpoint = new BaseEndpoint(this, organizationsEndpointPath);
    }

    // ─── Authentication ──────────────────────────────────────────────────────

    signIn(email, password) {
        if (useFakeAuth) {
            const found = mockUsers().filter(u => u.email === email && u.password === password);
            return Promise.resolve({ data: found });
        }
        return this.http.post(signInEndpointPath, { email, password });
    }

    registerUser(request) {
        if (useFakeAuth) {
            if (mockUsers().some(u => u.email === request.email)) {
                return Promise.reject(new Error('Email already registered'));
            }
            const newUser = { ...request, id: `u-${Date.now()}` };
            saveMockUser(newUser);
            return Promise.resolve({ data: newUser });
        }
        return this.http.post(signUpEndpointPath, request);
    }

    // ─── Users ───────────────────────────────────────────────────────────────

    getUsers() {
        if (useFakeAuth) return Promise.resolve({ data: mockUsers() });
        return this.#usersEndpoint.getAll();
    }

    getUserById(id) {
        if (useFakeAuth) return Promise.resolve({ data: mockUsers().find(u => u.id === id) || null });
        return this.#usersEndpoint.getById(id);
    }

    // ─── Organizations ───────────────────────────────────────────────────────

    createOrganization(request) {
        if (useFakeAuth) {
            const newOrg = { ...request, id: `org-${Date.now()}` };
            saveMockOrg(newOrg);
            return Promise.resolve({ data: newOrg });
        }
        return this.#organizationsEndpoint.create(request);
    }

    getOrganizationById(id) {
        if (useFakeAuth) {
            const org = mockOrgs().find(o => o.id === id) || null;
            if (!org) return Promise.reject(new Error('Organization not found'));
            return Promise.resolve({ data: org });
        }
        return this.#organizationsEndpoint.getById(id);
    }

    updateOrganization(resource) {
        if (useFakeAuth) return Promise.resolve({ data: resource });
        return this.#organizationsEndpoint.update(resource.id, resource);
    }
}
