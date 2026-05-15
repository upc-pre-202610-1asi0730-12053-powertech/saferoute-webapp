import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";
import seedData from '../../server/db.json';

const profilesEndpointPath = import.meta.env.VITE_STAKEHOLDER_ENDPOINT_PATH || '/profiles';
const parentsEndpointPath  = '/parents';
const childrenEndpointPath = '/children';
const groupsEndpointPath   = '/groups';
const useFakeAuth          = String(import.meta.env.VITE_USE_FAKE_AUTH).toLowerCase() === 'true';

function getCurrentOrgId() {
    try { return JSON.parse(localStorage.getItem('saferoute.user') || '{}').organizationId || null; }
    catch { return null; }
}

function mockKey() { return `saferoute.mock.profiles.${getCurrentOrgId() || 'default'}`; }
function mockGroupKey() { return `saferoute.mock.groups.${getCurrentOrgId() || 'default'}`; }

function mockProfiles(orgId) {
    const id    = orgId || getCurrentOrgId();
    const extra = JSON.parse(localStorage.getItem(mockKey()) || '[]');
    const seed  = id ? seedData.profiles.filter(p => p.organizationId === id) : [];
    return [...seed, ...extra];
}

function mockParents() {
    const orgId = getCurrentOrgId();
    const seed  = orgId ? seedData.parents.filter(p => p.organizationId === orgId) : seedData.parents;
    return seed;
}

function mockChildren() {
    const orgId = getCurrentOrgId();
    return orgId ? seedData.children.filter(c => c.organizationId === orgId) : seedData.children;
}

function mockGroups() {
    return JSON.parse(localStorage.getItem(mockGroupKey()) || '[]');
}

function saveMockProfile(profile) {
    const extra = JSON.parse(localStorage.getItem(mockKey()) || '[]');
    extra.push(profile);
    localStorage.setItem(mockKey(), JSON.stringify(extra));
    return profile;
}

/**
 * Infrastructure gateway for the Stakeholder bounded context.
 * Matches StakeholderApi in vue-saferoute-stakeholder.puml.
 *
 * @class StakeholderApi
 * @extends BaseApi
 */
export class StakeholderApi extends BaseApi {
    #profilesEndpoint;

    constructor() {
        super();
        this.#profilesEndpoint = new BaseEndpoint(this, profilesEndpointPath);
    }

    createParent(request) {
        if (useFakeAuth) {
            const newParent = { ...request, id: `p-${Date.now()}` };
            return Promise.resolve({ status: 201, data: newParent });
        }
        return this.http.post(parentsEndpointPath, request);
    }

    getParentsByOrganization(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockParents() });
        return this.http.get(`${parentsEndpointPath}?organizationId=${organizationId}`);
    }

    createDriver(request) {
        if (useFakeAuth) {
            const newDriver = { ...request, id: Date.now(), role: 'driver' };
            saveMockProfile(newDriver);
            return Promise.resolve({ status: 201, data: newDriver });
        }
        return this.#profilesEndpoint.create({ ...request, role: 'driver' });
    }

    getDriversByOrganization(organizationId) {
        if (useFakeAuth) {
            const drivers = mockProfiles().filter(p => p.role === 'driver');
            return Promise.resolve({ status: 200, data: drivers });
        }
        return this.http.get(`${profilesEndpointPath}?organizationId=${organizationId}&role=driver`);
    }

    createChild(request) {
        if (useFakeAuth) {
            const newChild = { ...request, id: `c-${Date.now()}` };
            return Promise.resolve({ status: 201, data: newChild });
        }
        return this.http.post(childrenEndpointPath, request);
    }

    getChildrenByParent(parentId) {
        if (useFakeAuth) {
            const children = mockChildren().filter(c => c.parentId === parentId);
            return Promise.resolve({ status: 200, data: children });
        }
        return this.http.get(`${childrenEndpointPath}?parentId=${parentId}`);
    }

    createStudentGroup(request) {
        if (useFakeAuth) {
            const newGroup = { ...request, id: `grp-${Date.now()}`, isFinalized: false };
            const list = mockGroups();
            list.push(newGroup);
            localStorage.setItem(mockGroupKey(), JSON.stringify(list));
            return Promise.resolve({ status: 201, data: newGroup });
        }
        return this.http.post(groupsEndpointPath, request);
    }

    getGroupsByOrganization(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockGroups() });
        return this.http.get(`${groupsEndpointPath}?organizationId=${organizationId}`);
    }

    finalizeGroup(groupId) {
        if (useFakeAuth) {
            const list = mockGroups();
            const idx = list.findIndex(g => g.id === groupId);
            if (idx !== -1) {
                list[idx].isFinalized = true;
                localStorage.setItem(mockGroupKey(), JSON.stringify(list));
            }
            return Promise.resolve({ status: 200, data: list[idx] || null });
        }
        return this.http.patch(`${groupsEndpointPath}/${groupId}`, { isFinalized: true });
    }

    // ─── Backward-compatible methods (used by existing views) ────────────────

    getProfiles(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockProfiles(organizationId) });
        return organizationId
            ? this.http.get(`${profilesEndpointPath}?organizationId=${organizationId}`)
            : this.#profilesEndpoint.getAll();
    }

    getProfileById(id) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockProfiles().find(p => p.id === id) || null });
        return this.#profilesEndpoint.getById(id);
    }

    createProfile(resource) {
        if (useFakeAuth) {
            const newProfile = { ...resource, id: Date.now() };
            saveMockProfile(newProfile);
            return Promise.resolve({ status: 201, data: newProfile });
        }
        return this.#profilesEndpoint.create(resource);
    }

    updateProfile(resource) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: resource });
        return this.#profilesEndpoint.update(resource.id, resource);
    }

    deleteProfile(id) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: {} });
        return this.#profilesEndpoint.delete(id);
    }
}
