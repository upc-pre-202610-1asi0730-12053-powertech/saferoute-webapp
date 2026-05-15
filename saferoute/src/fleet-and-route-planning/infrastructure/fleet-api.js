import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";
import seedData from '../../server/db.json';

const routeEndpointPath   = import.meta.env.VITE_ROUTE_ENDPOINT_PATH    || '/routes';
const vehicleEndpointPath = import.meta.env.VITE_VEHICLE_ENDPOINT_PATH  || '/vehicles';
const stopEndpointPath    = import.meta.env.VITE_STOP_ENDPOINT_PATH     || '/stops';
const useFakeAuth         = String(import.meta.env.VITE_USE_FAKE_AUTH).toLowerCase() === 'true';

/** Returns the current user's organizationId from localStorage session */
function getCurrentOrgId() {
    try { return JSON.parse(localStorage.getItem('saferoute.user') || '{}').organizationId || null; }
    catch { return null; }
}

/** Scoped localStorage key — each org gets its own namespace */
function mockRouteKey() { return `saferoute.mock.routes.${getCurrentOrgId() || 'default'}`; }
function mockVehicleKey() { return `saferoute.mock.vehicles.${getCurrentOrgId() || 'default'}`; }
function mockAssignmentKey() { return `saferoute.mock.assignments.${getCurrentOrgId() || 'default'}`; }

function mockRoutes() {
    const orgId = getCurrentOrgId();
    const extra = JSON.parse(localStorage.getItem(mockRouteKey()) || '[]');
    const seed  = orgId ? seedData.routes.filter(r => r.organizationId === orgId) : [];
    return [...seed, ...extra];
}

function mockVehicles() {
    const orgId = getCurrentOrgId();
    const seed  = orgId ? seedData.vehicles.filter(v => v.organizationId === orgId) : seedData.vehicles;
    const extra = JSON.parse(localStorage.getItem(mockVehicleKey()) || '[]');
    return [...seed, ...extra];
}

function mockAssignments() {
    return JSON.parse(localStorage.getItem(mockAssignmentKey()) || '[]');
}

function saveMockRoute(route) {
    const extra = JSON.parse(localStorage.getItem(mockRouteKey()) || '[]');
    extra.push(route);
    localStorage.setItem(mockRouteKey(), JSON.stringify(extra));
    return route;
}

function saveMockVehicle(vehicle) {
    const extra = JSON.parse(localStorage.getItem(mockVehicleKey()) || '[]');
    extra.push(vehicle);
    localStorage.setItem(mockVehicleKey(), JSON.stringify(extra));
    return vehicle;
}

function saveMockAssignment(assignment) {
    const list = mockAssignments();
    list.push(assignment);
    localStorage.setItem(mockAssignmentKey(), JSON.stringify(list));
    return assignment;
}

/**
 * Infrastructure gateway for the Fleet bounded context.
 * Matches FleetApi in vue-saferoute-fleet.puml.
 *
 * @class FleetApi
 * @extends BaseApi
 */
export class FleetApi extends BaseApi {
    #routesEndpoint;
    #vehiclesEndpoint;

    constructor() {
        super();
        this.#routesEndpoint   = new BaseEndpoint(this, routeEndpointPath);
        this.#vehiclesEndpoint = new BaseEndpoint(this, vehicleEndpointPath);
    }

    // ─── Route methods ─────────────────────────────────────────────

    createRoute(resource) {
        if (useFakeAuth) {
            const newRoute = { ...resource, id: Date.now() };
            saveMockRoute(newRoute);
            return Promise.resolve({ status: 201, data: newRoute });
        }
        return this.#routesEndpoint.create(resource);
    }

    getRoutesByOrganization(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockRoutes() });
        return this.http.get(`${routeEndpointPath}?organizationId=${organizationId}`);
    }

    activateRoute(id) {
        if (useFakeAuth) {
            return Promise.resolve({ status: 200, data: { id, routeState: 'ACTIVE' } });
        }
        return this.http.patch(`${routeEndpointPath}/${id}`, { routeState: 'ACTIVE' });
    }

    // ─── Stop methods ──────────────────────────────────────────────

    addStop(request) {
        if (useFakeAuth) {
            const newStop = { ...request, id: `stop-${Date.now()}` };
            return Promise.resolve({ status: 201, data: newStop });
        }
        return this.http.post(stopEndpointPath, request);
    }

    getStopsByRoute(routeId) {
        if (useFakeAuth) {
            const route = mockRoutes().find(r => String(r.id) === String(routeId));
            const stops = (route?.waypoints || []).map((wp, i) => ({
                id: `stop-${routeId}-${i}`,
                routeId,
                name: wp.name,
                latitude: wp.lat,
                longitude: wp.lng,
                stopOrder: wp.order || i + 1,
            }));
            return Promise.resolve({ status: 200, data: stops });
        }
        return this.http.get(`${stopEndpointPath}?routeId=${routeId}`);
    }

    // ─── Vehicle methods  ───────────────────────────────────────────

    createVehicle(request) {
        if (useFakeAuth) {
            const newVehicle = { ...request, id: Date.now() };
            saveMockVehicle(newVehicle);
            return Promise.resolve({ status: 201, data: newVehicle });
        }
        return this.#vehiclesEndpoint.create(request);
    }

    getVehiclesByOrganization(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockVehicles() });
        return this.http.get(`${vehicleEndpointPath}?organizationId=${organizationId}`);
    }

    // ─── Assignment methods ────────────────────────────────────────

    createAssignment(request) {
        if (useFakeAuth) {
            const newAssignment = { ...request, id: `asgn-${Date.now()}` };
            saveMockAssignment(newAssignment);
            return Promise.resolve({ status: 201, data: newAssignment });
        }
        return this.http.post('/assignments', request);
    }

    getAssignmentByRoute(routeId) {
        if (useFakeAuth) {
            const found = mockAssignments().find(a => String(a.routeId) === String(routeId));
            return Promise.resolve({ status: 200, data: found || null });
        }
        return this.http.get(`/assignments?routeId=${routeId}`);
    }

    // ─── Backward-compatible methods ────────────────

    getRoutes() {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockRoutes() });
        return this.#routesEndpoint.getAll();
    }

    getRouteById(id) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockRoutes().find(r => r.id === id) ?? null });
        return this.#routesEndpoint.getById(id);
    }

    updateRoute(resource) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: resource });
        return this.#routesEndpoint.update(resource.id, resource);
    }

    deleteRoute(id) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: {} });
        return this.#routesEndpoint.delete(id);
    }
}

/**
 * Backward-compatible alias — existing views import RouteApi.
 */
export { FleetApi as RouteApi };
