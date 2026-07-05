import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";

const routeEndpointPath   = import.meta.env.VITE_ROUTE_ENDPOINT_PATH    || '/routes';
const vehicleEndpointPath = import.meta.env.VITE_VEHICLE_ENDPOINT_PATH  || '/vehicles';
const useFakeAuth         = String(import.meta.env.VITE_USE_FAKE_AUTH).toLowerCase() === 'true';
const defaultServiceDays  = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

function getCurrentOrgId() {
    try { return JSON.parse(localStorage.getItem('saferoute.user') || '{}').organizationId || null; }
    catch { return null; }
}

function mockRouteKey() { return `saferoute.mock.routes.${getCurrentOrgId() || 'default'}`; }
function mockVehicleKey() { return `saferoute.mock.vehicles.${getCurrentOrgId() || 'default'}`; }
function mockAssignmentKey() { return `saferoute.mock.assignments.${getCurrentOrgId() || 'default'}`; }
function routeUiStateKey() { return `saferoute.routes.ui.${getCurrentOrgId() || 'default'}`; }

function mockRoutes(orgId) {
    const id    = orgId || getCurrentOrgId();
    const extra = JSON.parse(localStorage.getItem(mockRouteKey()) || '[]');
    return id ? extra : [];
}

function mockVehicles() {
    const orgId = getCurrentOrgId();
    const extra = JSON.parse(localStorage.getItem(mockVehicleKey()) || '[]');
    return orgId ? extra : [];
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

function readRouteUiState() {
    try { return JSON.parse(localStorage.getItem(routeUiStateKey()) || '{}'); }
    catch { return {}; }
}

function saveRouteUiState(routeId, resource) {
    if (!routeId || !resource) return;
    const state = readRouteUiState();
    state[routeId] = {
        type: resource.type,
        origin: resource.origin,
        destination: resource.destination,
        driverName: resource.driverName,
        vehicleId: resource.vehicleId,
        vehiclePlate: resource.vehiclePlate,
        scheduledStartTime: resource.scheduledStartTime || resource.departureTime,
        status: resource.status,
        waypoints: resource.waypoints || [],
        studentIds: resource.studentIds || [],
    };
    localStorage.setItem(routeUiStateKey(), JSON.stringify(state));
}

function toUiRoute(resource, fallback = {}) {
    const cached = readRouteUiState()[resource?.id] || {};
    const assignment = resource?.assignment || {};
    const vehicle = resource?.vehicle || {};
    const stops = resource?.stops || [];
    const childIds = assignment.childIds || cached.studentIds || fallback.studentIds || [];
    const cachedWaypoints = cached.waypoints || fallback.waypoints || [];
    const waypoints = stops.length
        ? stops.map((stop, index) => ({
            id: stop.id,
            name: stop.name,
            lat: stop.latitude,
            lng: stop.longitude,
            order: stop.order ?? index + 1,
            studentIds: cachedWaypoints[index]?.studentIds?.length
                ? cachedWaypoints[index].studentIds
                : index === 0
                    ? childIds
                    : [],
        }))
        : cachedWaypoints;
    const inferredType = (resource?.departureTime || fallback.departureTime || cached.scheduledStartTime || '')
        >= '12:00' ? 'RETURN' : 'OUTBOUND';

    return {
        ...fallback,
        ...resource,
        id: resource?.id ?? fallback.id,
        organizationId: resource?.organizationId ?? fallback.organizationId,
        name: resource?.name ?? fallback.name,
        routeState: resource?.routeState || resource?.state || fallback.routeState || fallback.status,
        status: cached.status || fallback.status || resource?.state || resource?.routeState,
        departureTime: resource?.departureTime || cached.scheduledStartTime || fallback.departureTime,
        scheduledStartTime: cached.scheduledStartTime || fallback.scheduledStartTime || resource?.departureTime,
        serviceDays: resource?.serviceDays || fallback.serviceDays || defaultServiceDays,
        vehicleId: cached.vehicleId || fallback.vehicleId || vehicle.id || null,
        vehiclePlate: cached.vehiclePlate || fallback.vehiclePlate || vehicle.plate || '',
        driverId: assignment.driverId || fallback.driverId || null,
        driverName: cached.driverName || fallback.driverName || '',
        studentIds: childIds,
        type: cached.type || fallback.type || resource?.type || inferredType,
        origin: cached.origin || fallback.origin || waypoints[0]?.name || '',
        destination: cached.destination || fallback.destination || waypoints[waypoints.length - 1]?.name || '',
        waypoints,
        stops: waypoints.length,
    };
}

function toWaypointPayload(waypoint) {
    return {
        name: waypoint.name,
        latitude: waypoint.latitude ?? waypoint.lat,
        longitude: waypoint.longitude ?? waypoint.lng,
    };
}

async function ignoreNotSupported(promise, fallback) {
    try { return await promise; }
    catch { return fallback; }
}

export class FleetApi extends BaseApi {
    #routesEndpoint;
    #vehiclesEndpoint;

    constructor() {
        super();
        this.#routesEndpoint   = new BaseEndpoint(this, routeEndpointPath);
        this.#vehiclesEndpoint = new BaseEndpoint(this, vehicleEndpointPath);
    }

    async createRoute(resource) {
        if (useFakeAuth) {
            const newRoute = { ...resource, id: Date.now() };
            saveMockRoute(newRoute);
            return Promise.resolve({ status: 201, data: newRoute });
        }

        const created = await this.#routesEndpoint.create({
            organizationId: resource.organizationId,
            name: resource.name,
        });
        let route = created.data;
        const routeId = route.id;

        for (const waypoint of resource.waypoints || []) {
            const response = await this.http.post(`${routeEndpointPath}/${routeId}/stops`, toWaypointPayload(waypoint));
            route = response.data;
        }

        const departureTime = resource.scheduledStartTime || resource.departureTime;
        if (departureTime) {
            const response = await this.http.put(`${routeEndpointPath}/${routeId}/departure-time`, { departureTime });
            route = response.data;
        }

        const serviceDays = resource.serviceDays?.length ? resource.serviceDays : defaultServiceDays;
        const serviceResponse = await this.http.put(`${routeEndpointPath}/${routeId}/service-days`, { days: serviceDays });
        route = serviceResponse.data;

        if (resource.vehicleId || resource.vehiclePlate) {
            let selectedVehicle = null;
            if (resource.vehicleId) {
                selectedVehicle = await ignoreNotSupported(
                    this.#vehiclesEndpoint.getById(resource.vehicleId).then(response => response.data),
                    null
                );
            }
            const vehiclePayload = {
                plate: resource.vehiclePlate || selectedVehicle?.plate || 'UNASSIGNED',
                model: resource.vehicleModel || selectedVehicle?.model || 'Vehicle',
                brand: resource.vehicleBrand || selectedVehicle?.brand || 'SafeRoute',
                capacity: Number(resource.vehicleCapacity || selectedVehicle?.capacity || resource.studentIds?.length || 1),
            };
            const response = await this.http.put(`${routeEndpointPath}/${routeId}/vehicle`, vehiclePayload);
            route = response.data;
        }

        if (resource.driverId) {
            const response = await this.http.put(`${routeEndpointPath}/${routeId}/driver`, { driverId: resource.driverId });
            route = response.data;
        }

        for (const childId of resource.studentIds || []) {
            const response = await this.http.post(`${routeEndpointPath}/${routeId}/children`, { childId });
            route = response.data;
        }

        if (resource.driverId && (resource.studentIds || []).length && (resource.waypoints || []).length >= 2 && departureTime) {
            const response = await ignoreNotSupported(
                this.http.post(`${routeEndpointPath}/${routeId}/activate`),
                { data: route }
            );
            route = response.data;
        }

        saveRouteUiState(routeId, resource);
        return { ...created, data: toUiRoute(route, resource) };
    }

    async getRoutesByOrganization(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockRoutes() });
        const response = organizationId
            ? await this.http.get(`${routeEndpointPath}?organizationId=${organizationId}`)
            : await this.#routesEndpoint.getAll();
        return { ...response, data: (response.data || []).map(route => toUiRoute(route)) };
    }

    async activateRoute(id) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: { id, routeState: 'ACTIVE' } });
        const response = await this.http.post(`${routeEndpointPath}/${id}/activate`);
        return { ...response, data: toUiRoute(response.data) };
    }

    async addStop(request) {
        if (useFakeAuth) {
            const newStop = { ...request, id: `stop-${Date.now()}` };
            return Promise.resolve({ status: 201, data: newStop });
        }
        return this.http.post(`${routeEndpointPath}/${request.routeId}/stops`, toWaypointPayload(request));
    }

    async getStopsByRoute(routeId) {
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
        const response = await this.#routesEndpoint.getById(routeId);
        return { ...response, data: toUiRoute(response.data).waypoints };
    }

    createVehicle(request) {
        if (useFakeAuth) {
            const newVehicle = { ...request, id: Date.now() };
            saveMockVehicle(newVehicle);
            return Promise.resolve({ status: 201, data: newVehicle });
        }
        return this.#vehiclesEndpoint.create(request);
    }

    updateVehicle(id, request) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: { ...request, id } });
        return this.#vehiclesEndpoint.update(id, request);
    }

    deleteVehicle(id) {
        if (useFakeAuth) return Promise.resolve({ status: 204, data: {} });
        return this.#vehiclesEndpoint.delete(id);
    }

    async getVehiclesByOrganization(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockVehicles() });
        const response = await this.#vehiclesEndpoint.getAll();
        return {
            ...response,
            data: (response.data || []).filter(vehicle => !organizationId || vehicle.organizationId === organizationId),
        };
    }

    async getDriversByOrganization(organizationId) {
        if (useFakeAuth) return { status: 200, data: [] };
        const response = await this.http.get('/drivers');
        return {
            ...response,
            data: (response.data || []).filter(driver => !organizationId || driver.organizationId === organizationId),
        };
    }

    async getChildrenByOrganization(organizationId) {
        if (useFakeAuth) return { status: 200, data: [] };
        const response = await this.http.get('/parents');
        const children = (response.data || [])
            .filter(parent => !organizationId || parent.organizationId === organizationId)
            .flatMap(parent =>
            (parent.children || []).map(child => ({
                ...child,
                parentId: parent.id,
                organizationId: parent.organizationId,
            }))
        );
        return { ...response, data: children };
    }

    createAssignment(request) {
        if (useFakeAuth) {
            const newAssignment = { ...request, id: `asgn-${Date.now()}` };
            saveMockAssignment(newAssignment);
            return Promise.resolve({ status: 201, data: newAssignment });
        }
        return Promise.resolve({ status: 200, data: request });
    }

    getAssignmentByRoute(routeId) {
        if (useFakeAuth) {
            const found = mockAssignments().find(a => String(a.routeId) === String(routeId));
            return Promise.resolve({ status: 200, data: found || null });
        }
        return this.getRouteById(routeId).then(response => ({ ...response, data: response.data.assignment || null }));
    }

    getRoutes(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockRoutes(organizationId) });
        return this.getRoutesByOrganization(organizationId);
    }

    async getRouteById(id) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockRoutes().find(r => r.id === id) ?? null });
        const response = await this.#routesEndpoint.getById(id);
        return { ...response, data: toUiRoute(response.data) };
    }

    async updateRoute(resource) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: resource });
        saveRouteUiState(resource.id, resource);
        const response = await this.#routesEndpoint.update(resource.id, resource);
        return { ...response, data: toUiRoute(response.data, resource) };
    }

    async deleteRoute(id) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: {} });
        const state = readRouteUiState();
        delete state[id];
        localStorage.setItem(routeUiStateKey(), JSON.stringify(state));
        return this.#routesEndpoint.delete(id);
    }
}

export { FleetApi as RouteApi };
