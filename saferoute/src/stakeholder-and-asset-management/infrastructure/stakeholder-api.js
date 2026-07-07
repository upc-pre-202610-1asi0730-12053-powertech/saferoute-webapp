import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";

const profilesEndpointPath = import.meta.env.VITE_STAKEHOLDER_ENDPOINT_PATH || '/profiles';
const parentsEndpointPath  = '/parents';
const driversEndpointPath  = '/drivers';
const groupsEndpointPath   = import.meta.env.VITE_STUDENT_GROUPS_ENDPOINT_PATH || '/student-groups';
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
    return id ? extra : [];
}

function mockParents() {
    return [];
}

function mockChildren() {
    return [];
}

function mockGroups() {
    return JSON.parse(localStorage.getItem(mockGroupKey()) || '[]');
}

function getStoredProfiles() {
    return JSON.parse(localStorage.getItem(mockKey()) || '[]');
}

function saveStoredProfiles(profiles) {
    localStorage.setItem(mockKey(), JSON.stringify(profiles));
}

function saveMockProfile(profile) {
    const extra = getStoredProfiles();
    const index = extra.findIndex(item => String(item.id) === String(profile.id));
    if (index === -1) extra.push(profile);
    else extra[index] = profile;
    saveStoredProfiles(extra);
    return profile;
}

function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('saferoute.user') || '{}'); }
    catch { return {}; }
}

function splitName(resource) {
    const fullName = resource.fullName || resource.name || '';
    const [first = '', ...rest] = fullName.trim().split(/\s+/);
    return {
        firstName: resource.firstName || first,
        lastName: resource.lastName || rest.join(' ') || '-',
    };
}

function slug(value) {
    return String(value || 'user')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/(^\.|\.$)/g, '') || 'user';
}

function fallbackEmail(resource, role) {
    return resource.email || `${slug(resource.name || resource.fullName || role)}.${Date.now()}@saferoute.local`;
}

function fallbackPhone(resource) {
    return resource.phoneNumber || resource.phone || '000000000';
}

function fallbackLicense(resource) {
    return resource.licenseNumber || resource.license || `LIC-${Date.now()}`;
}

function toAge(resource) {
    const value = Number(resource.age || resource.grade || 0);
    return Number.isFinite(value) && value >= 0 ? value : 0;
}

function toProfileCreatePayload(resource) {
    const currentUser = getCurrentUser();
    const { firstName, lastName } = splitName(resource);
    const organizationId = resource.organizationId || currentUser.organizationId;
    const userId = resource.userId || currentUser.id;
    if (!organizationId || !userId || !firstName || !lastName) return null;
    return {
        organizationId,
        userId,
        firstName,
        lastName,
        phone: resource.phone || resource.phoneNumber || '',
        role: resource.role || 'parent',
        license: resource.license || resource.licenseNumber || null,
        status: resource.status || 'ACTIVE',
    };
}

function toParentPayload(resource) {
    const currentUser = getCurrentUser();
    const { firstName, lastName } = splitName(resource);
    const organizationId = resource.organizationId || currentUser.organizationId;
    if (!organizationId || !firstName || !lastName) return null;
    const payload = {
        organizationId,
        firstName,
        lastName,
        email: fallbackEmail(resource, 'parent'),
        phoneNumber: fallbackPhone(resource),
    };
    if (resource.userId) payload.userId = resource.userId;
    if (resource.password) payload.password = resource.password;
    return payload;
}

function toDriverPayload(resource) {
    const currentUser = getCurrentUser();
    const { firstName, lastName } = splitName(resource);
    const organizationId = resource.organizationId || currentUser.organizationId;
    if (!organizationId || !firstName || !lastName) return null;
    const payload = {
        organizationId,
        firstName,
        lastName,
        email: fallbackEmail(resource, 'driver'),
        phoneNumber: fallbackPhone(resource),
        licenseNumber: fallbackLicense(resource),
    };
    if (resource.userId) payload.userId = resource.userId;
    if (resource.password) payload.password = resource.password;
    return payload;
}

function toChildPayload(resource) {
    const { firstName, lastName } = splitName(resource);
    if (!resource.parentId || !firstName || !lastName) return null;
    return {
        parentId: resource.parentId,
        payload: {
            firstName,
            lastName,
            age: toAge(resource),
        },
    };
}

function withStoredProfiles(data, organizationId) {
    const local = getStoredProfiles();
    return [...(data || []), ...local]
        .filter(profile => !organizationId || profile.organizationId === organizationId);
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
        const payload = toParentPayload(request);
        if (!payload) return Promise.resolve({ status: 201, data: saveMockProfile({ ...request, id: `p-${Date.now()}`, role: 'parent' }) });
        return this.http.post(parentsEndpointPath, payload);
    }

    updateParent(id, request) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: { ...request, id } });
        const payload = toParentPayload(request);
        if (!payload) return Promise.resolve({ status: 200, data: { ...request, id } });
        return this.http.put(`${parentsEndpointPath}/${id}`, payload);
    }

    deleteParent(id) {
        if (useFakeAuth) return Promise.resolve({ status: 204, data: {} });
        return this.http.delete(`${parentsEndpointPath}/${id}`);
    }

    async getParentsByOrganization(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockParents() });
        const response = await this.http.get(parentsEndpointPath);
        return {
            ...response,
            data: (response.data || []).filter(parent => !organizationId || parent.organizationId === organizationId),
        };
    }

    createDriver(request) {
        if (useFakeAuth) {
            const newDriver = { ...request, id: Date.now(), role: 'driver' };
            saveMockProfile(newDriver);
            return Promise.resolve({ status: 201, data: newDriver });
        }
        const payload = toDriverPayload(request);
        if (!payload) return Promise.resolve({ status: 201, data: saveMockProfile({ ...request, id: Date.now(), role: 'driver' }) });
        return this.http.post(driversEndpointPath, payload);
    }

    updateDriver(id, request) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: { ...request, id } });
        const payload = toDriverPayload(request);
        if (!payload) return Promise.resolve({ status: 200, data: { ...request, id } });
        return this.http.put(`${driversEndpointPath}/${id}`, payload);
    }

    deleteDriver(id) {
        if (useFakeAuth) return Promise.resolve({ status: 204, data: {} });
        return this.http.delete(`${driversEndpointPath}/${id}`);
    }

    async getDriversByOrganization(organizationId) {
        if (useFakeAuth) {
            const drivers = mockProfiles().filter(p => p.role === 'driver');
            return Promise.resolve({ status: 200, data: drivers });
        }
        const response = await this.http.get(driversEndpointPath);
        return {
            ...response,
            data: (response.data || []).filter(driver => !organizationId || driver.organizationId === organizationId),
        };
    }

    async createChild(request) {
        if (useFakeAuth) {
            const newChild = { ...request, id: `c-${Date.now()}` };
            return Promise.resolve({ status: 201, data: newChild });
        }
        const child = toChildPayload(request);
        if (!child) return Promise.resolve({ status: 201, data: { ...request, id: `c-${Date.now()}` } });
        const response = await this.http.post(`${parentsEndpointPath}/${child.parentId}/children`, child.payload);
        const createdChild = (response.data?.children || []).at(-1) || { ...request, id: `c-${Date.now()}` };
        return { ...response, data: { ...createdChild, parentId: child.parentId } };
    }

    deleteChild(parentId, childId) {
        if (useFakeAuth) return Promise.resolve({ status: 204, data: {} });
        return this.http.delete(`${parentsEndpointPath}/${parentId}/children/${childId}`);
    }

    async getChildrenByParent(parentId) {
        if (useFakeAuth) {
            const children = mockChildren().filter(c => c.parentId === parentId);
            return Promise.resolve({ status: 200, data: children });
        }
        const response = await this.http.get(`${parentsEndpointPath}/${parentId}`);
        return {
            ...response,
            data: (response.data?.children || []).map(child => ({ ...child, parentId })),
        };
    }

    async createStudentGroup(request) {
        if (useFakeAuth) {
            const newGroup = { ...request, id: `grp-${Date.now()}`, isFinalized: false };
            const list = mockGroups();
            list.push(newGroup);
            localStorage.setItem(mockGroupKey(), JSON.stringify(list));
            return Promise.resolve({ status: 201, data: newGroup });
        }
        let response = await this.http.post(groupsEndpointPath, {
            organizationId: request.organizationId,
            name: request.name,
        });
        const groupId = response.data.id;
        for (const childId of request.childIds || []) {
            response = await this.http.post(`${groupsEndpointPath}/${groupId}/children`, { childId });
        }
        return response;
    }

    async getGroupsByOrganization(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockGroups() });
        const response = await this.http.get(groupsEndpointPath);
        return {
            ...response,
            data: (response.data || []).filter(group => !organizationId || group.organizationId === organizationId),
        };
    }

    async finalizeGroup(groupId) {
        if (useFakeAuth) {
            const list = mockGroups();
            const idx = list.findIndex(g => g.id === groupId);
            if (idx !== -1) {
                list[idx].isFinalized = true;
                localStorage.setItem(mockGroupKey(), JSON.stringify(list));
            }
            return Promise.resolve({ status: 200, data: list[idx] || null });
        }
        return this.http.post(`${groupsEndpointPath}/${groupId}/finalize`);
    }

    async addChildToGroup(groupId, childId) {
        if (useFakeAuth) {
            const list = mockGroups();
            const idx = list.findIndex(g => String(g.id) === String(groupId));
            if (idx !== -1) {
                const childIds = new Set((list[idx].childIds || []).map(String));
                childIds.add(String(childId));
                list[idx].childIds = [...childIds];
                localStorage.setItem(mockGroupKey(), JSON.stringify(list));
            }
            return Promise.resolve({ status: 200, data: list[idx] || null });
        }
        return this.http.post(`${groupsEndpointPath}/${groupId}/children`, { childId });
    }

    async removeChildFromGroup(groupId, childId) {
        if (useFakeAuth) {
            const list = mockGroups();
            const idx = list.findIndex(g => String(g.id) === String(groupId));
            if (idx !== -1) {
                list[idx].childIds = (list[idx].childIds || []).filter(id => String(id) !== String(childId));
                localStorage.setItem(mockGroupKey(), JSON.stringify(list));
            }
            return Promise.resolve({ status: 204, data: {} });
        }
        return this.http.delete(`${groupsEndpointPath}/${groupId}/children/${childId}`);
    }

    // ─── Backward-compatible methods (used by existing views) ────────────────

    async getProfiles(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockProfiles(organizationId) });
        const response = await this.#profilesEndpoint.getAll();
        return { ...response, data: withStoredProfiles(response.data, organizationId) };
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
        const role = String(resource.role || '').toLowerCase();
        if (role === 'driver') {
            const payload = toDriverPayload(resource);
            if (payload) return this.http.post(driversEndpointPath, payload);
        }
        if (role === 'parent') {
            const payload = toParentPayload(resource);
            if (payload) return this.http.post(parentsEndpointPath, payload);
        }
        return Promise.resolve({ status: 201, data: saveMockProfile({ ...resource, id: Date.now() }) });
    }

    updateProfile(resource) {
        saveMockProfile(resource);
        return Promise.resolve({ status: 200, data: resource });
    }

    deleteProfile(id) {
        const filtered = getStoredProfiles().filter(profile => String(profile.id) !== String(id));
        saveStoredProfiles(filtered);
        return Promise.resolve({ status: 204, data: {} });
    }
}
