import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";
import seedData from '../../server/db.json';

const endpointPath = import.meta.env.VITE_TRIP_ENDPOINT_PATH || '/trips';
const useFakeAuth  = String(import.meta.env.VITE_USE_FAKE_AUTH).toLowerCase() === 'true';

function getCurrentOrgId() {
    try { return JSON.parse(localStorage.getItem('saferoute.user') || '{}').organizationId || null; }
    catch { return null; }
}

function extraKey()     { return `saferoute.mock.trips.extra.${getCurrentOrgId() || 'default'}`; }
function stateKey()     { return `saferoute.mock.trips.state.${getCurrentOrgId() || 'default'}`; }
function incidentsKey() { return `saferoute.incidents.${getCurrentOrgId() || 'default'}`; }
function tripUiStateKey() { return `saferoute.trips.ui.${getCurrentOrgId() || 'default'}`; }

function getExtra() { return JSON.parse(localStorage.getItem(extraKey()) || '[]'); }
function getState() { return JSON.parse(localStorage.getItem(stateKey()) || '{}'); }

function mockTrips(orgId) {
    const id    = orgId || getCurrentOrgId();
    const state = getState();
    const seed  = id ? seedData.trips.filter(t => t.organizationId === id) : [];
    const base  = [...seed, ...getExtra()];
    return base.map(t => state[t.id] ? { ...t, ...state[t.id] } : t);
}

function saveExtra(trip) {
    const extra = getExtra();
    extra.push(trip);
    localStorage.setItem(extraKey(), JSON.stringify(extra));
}

function patchState(id, partial) {
    const state = getState();
    state[id] = { ...(state[id] || {}), ...partial };
    localStorage.setItem(stateKey(), JSON.stringify(state));
}

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

function readTripUiState() {
    try { return JSON.parse(localStorage.getItem(tripUiStateKey()) || '{}'); }
    catch { return {}; }
}

function saveTripUiState(tripId, resource) {
    if (!tripId || !resource) return;
    const state = readTripUiState();
    state[tripId] = {
        routeName: resource.routeName,
        driverName: resource.driverName,
        vehicleId: resource.vehicleId,
        vehiclePlate: resource.vehiclePlate,
        studentIds: resource.studentIds || [],
        studentsTotal: resource.studentsTotal,
        studentsBoarded: resource.studentsBoarded,
        tripType: resource.tripType || resource.type,
        scheduledDate: resource.scheduledDate,
        scheduledStartTime: resource.scheduledStartTime,
        currentStop: resource.currentStop,
        currentLocation: resource.currentLocation,
    };
    localStorage.setItem(tripUiStateKey(), JSON.stringify(state));
}

function toUiTripState(state) {
    if (state === 'PENDING') return 'SCHEDULED';
    if (state === 'IN_PROGRESS') return 'EN_ROUTE';
    return state || 'SCHEDULED';
}

function toServerBoardingState(state) {
    if (state === 'ABORDADO') return 'BOARDED';
    if (state === 'AUSENTE') return 'MISSING';
    if (state === 'EN_ESPERA') return 'OMITTED';
    return state;
}

function toUiAttendance(attendance, tripId) {
    return {
        ...attendance,
        tripId,
        boardingState: attendance.boardingState,
    };
}

function toUiIncident(incident, tripId) {
    return {
        ...incident,
        tripId,
        timestamp: incident.reportedAt,
        status: incident.status || 'OPEN',
    };
}

function toUiTrip(resource, fallback = {}) {
    const cached = readTripUiState()[resource?.id] || {};
    const attendances = (resource?.attendances || []).map(attendance => toUiAttendance(attendance, resource.id));
    const incidents = (resource?.incidents || []).map(incident => toUiIncident(incident, resource.id));
    const uiState = toUiTripState(resource?.tripState || resource?.status || fallback.tripState || fallback.status);
    const studentIds = cached.studentIds || fallback.studentIds || attendances.map(a => a.childId);
    const studentsBoarded = cached.studentsBoarded ?? attendances.filter(a => a.boardingState === 'BOARDED').length;

    return {
        ...fallback,
        ...resource,
        id: resource?.id ?? fallback.id,
        organizationId: resource?.organizationId ?? fallback.organizationId,
        routeId: resource?.routeId ?? fallback.routeId,
        driverId: resource?.driverId ?? fallback.driverId,
        tripState: uiState,
        status: uiState,
        attendances,
        incidents,
        routeName: cached.routeName || fallback.routeName || '',
        driverName: cached.driverName || fallback.driverName || '',
        vehicleId: cached.vehicleId || fallback.vehicleId || null,
        vehiclePlate: cached.vehiclePlate || fallback.vehiclePlate || '',
        studentIds,
        studentsTotal: cached.studentsTotal ?? fallback.studentsTotal ?? studentIds.length,
        studentsBoarded,
        tripType: cached.tripType || fallback.tripType || fallback.type || '',
        scheduledDate: cached.scheduledDate || fallback.scheduledDate || todayISO(),
        scheduledStartTime: cached.scheduledStartTime || fallback.scheduledStartTime || '',
        currentStop: cached.currentStop || fallback.currentStop || null,
        currentLocation: cached.currentLocation || fallback.currentLocation || null,
    };
}

export class TripApi extends BaseApi {
    #tripsEndpoint;

    constructor() {
        super();
        this.#tripsEndpoint = new BaseEndpoint(this, endpointPath);
    }

    async getTrips(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockTrips(organizationId) });
        const response = await this.#tripsEndpoint.getAll();
        let trips = (response.data || []).map(trip => toUiTrip(trip));
        if (organizationId) trips = trips.filter(trip => trip.organizationId === organizationId);
        return { ...response, data: trips };
    }

    async getTripById(id) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockTrips().find(t => t.id === id) ?? null });
        const response = await this.#tripsEndpoint.getById(id);
        return { ...response, data: toUiTrip(response.data) };
    }

    async createTrip(resource) {
        if (useFakeAuth) {
            const newTrip = { ...resource, id: Date.now() };
            saveExtra(newTrip);
            return Promise.resolve({ status: 201, data: newTrip });
        }
        const payload = {
            organizationId: resource.organizationId,
            routeId: resource.routeId,
            driverId: resource.driverId,
        };
        const response = await this.#tripsEndpoint.create(payload);
        saveTripUiState(response.data.id, resource);
        return { ...response, data: toUiTrip(response.data, resource) };
    }

    async updateTrip(resource) {
        if (useFakeAuth) {
            patchState(resource.id, resource);
            return Promise.resolve({ status: 200, data: resource });
        }

        saveTripUiState(resource.id, resource);

        if (resource.status === 'EN_ROUTE' || resource.tripState === 'EN_ROUTE') {
            const response = await this.http.post(`${endpointPath}/${resource.id}/start`);
            return { ...response, data: toUiTrip(response.data, resource) };
        }

        if (resource.status === 'COMPLETED' || resource.tripState === 'COMPLETED') {
            const response = await this.http.post(`${endpointPath}/${resource.id}/complete`);
            return { ...response, data: toUiTrip(response.data, resource) };
        }

        return Promise.resolve({ status: 200, data: toUiTrip({ id: resource.id, ...resource }, resource) });
    }

    deleteTrip(id) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: {} });
        return Promise.resolve({ status: 204, data: { id } });
    }

    async startTrip(request) {
        if (useFakeAuth) {
            const newTrip = { ...request, id: Date.now(), tripState: 'EN_ROUTE', status: 'EN_ROUTE', startTime: new Date().toISOString() };
            saveExtra(newTrip);
            return Promise.resolve({ status: 201, data: newTrip });
        }

        if (request.id) return this.updateTrip({ ...request, status: 'EN_ROUTE' });
        const created = await this.createTrip(request);
        return this.updateTrip({ ...created.data, status: 'EN_ROUTE' });
    }

    async completeTrip(id) {
        if (useFakeAuth) {
            const patch = { tripState: 'COMPLETED', status: 'COMPLETED', endTime: new Date().toISOString() };
            patchState(id, patch);
            const found = mockTrips().find(t => String(t.id) === String(id));
            return Promise.resolve({ status: 200, data: found ? { ...found, ...patch } : patch });
        }
        const response = await this.http.post(`${endpointPath}/${id}/complete`);
        return { ...response, data: toUiTrip(response.data) };
    }

    async updateBoardingStatus(tripId, request) {
        if (useFakeAuth) {
            return Promise.resolve({ status: 200, data: { tripId, ...request, boardedAt: new Date().toISOString() } });
        }
        const response = await this.http.post(`${endpointPath}/${tripId}/boarding`, {
            childId: request.childId,
            boardingState: toServerBoardingState(request.boardingState),
        });
        const trip = toUiTrip(response.data);
        const attendance = trip.attendances.find(a => a.childId === request.childId) || {
            tripId,
            childId: request.childId,
            boardingState: toServerBoardingState(request.boardingState),
            boardedAt: new Date().toISOString(),
        };
        saveTripUiState(tripId, trip);
        return { ...response, data: attendance };
    }

    async getAttendancesByTrip(tripId) {
        if (useFakeAuth) {
            const trip = mockTrips().find(t => String(t.id) === String(tripId));
            const attendances = (trip?.studentIds || []).map((childId, i) => ({
                id: `att-${tripId}-${i}`,
                tripId: String(tripId),
                childId,
                boardingState: trip?.studentsBoarded > i ? 'BOARDED' : 'PENDING',
                boardedAt: trip?.studentsBoarded > i ? new Date().toISOString() : '',
            }));
            return Promise.resolve({ status: 200, data: attendances });
        }
        const response = await this.getTripById(tripId);
        return { ...response, data: response.data.attendances };
    }

    async reportIncident(tripId, request) {
        if (useFakeAuth) {
            const iKey = incidentsKey();
            const incidents = JSON.parse(localStorage.getItem(iKey) || '[]');
            const newIncident = {
                id: `i-${Date.now()}`,
                tripId,
                description: request.description || '',
                reportedAt: new Date().toISOString(),
                type: request.type || 'OTRO',
                severity: request.severity || 'LOW',
                reportedBy: request.reportedBy || 'SYSTEM',
                status: 'OPEN',
                organizationId: getCurrentOrgId() || 'default',
            };
            incidents.push(newIncident);
            localStorage.setItem(iKey, JSON.stringify(incidents));
            return Promise.resolve({ status: 201, data: newIncident });
        }
        const response = await this.http.post(`${endpointPath}/${tripId}/incidents`, { description: request.description });
        const trip = toUiTrip(response.data);
        const incident = trip.incidents[trip.incidents.length - 1] || {
            tripId,
            description: request.description,
            reportedAt: new Date().toISOString(),
        };
        saveTripUiState(tripId, trip);
        return { ...response, data: incident };
    }

    async getIncidentsByTrip(tripId) {
        if (useFakeAuth) {
            const iKey = incidentsKey();
            const all = JSON.parse(localStorage.getItem(iKey) || '[]');
            const filtered = all.filter(i => String(i.tripId) === String(tripId));
            return Promise.resolve({ status: 200, data: filtered });
        }
        const response = await this.getTripById(tripId);
        return { ...response, data: response.data.incidents };
    }

    async autoCreateTripForRoute(route, scheduledDate) {
        if (!useFakeAuth) {
            const existing = await this.http.get(`${endpointPath}?routeId=${route.id}`).catch(() => ({ data: [] }));
            if ((existing.data || []).length > 0) {
                return { status: 409, reason: 'duplicate', data: toUiTrip(existing.data[0], route) };
            }
            const response = await this.createTrip({
                organizationId: route.organizationId,
                routeId: route.id,
                driverId: route.driverId,
                routeName: route.name,
                driverName: route.driverName,
                vehicleId: route.vehicleId,
                vehiclePlate: route.vehiclePlate,
                studentIds: route.studentIds || [],
                studentsTotal: (route.studentIds || []).length,
                studentsBoarded: 0,
                tripType: route.type,
                scheduledDate: scheduledDate || todayISO(),
                scheduledStartTime: route.scheduledStartTime,
                status: 'SCHEDULED',
            });
            return response;
        }

        const date = scheduledDate || todayISO();
        const all  = mockTrips();
        const dup = all.find(t =>
            String(t.routeId) === String(route.id) &&
            t.scheduledDate   === date &&
            t.scheduledStartTime === route.scheduledStartTime &&
            t.status !== 'CANCELLED'
        );
        if (dup) return Promise.resolve({ status: 409, reason: 'duplicate', data: dup });

        const conflict = all.find(t =>
            t.scheduledDate      === date &&
            t.scheduledStartTime === route.scheduledStartTime &&
            ['SCHEDULED', 'EN_ROUTE'].includes(t.status) &&
            (t.driverId === route.driverId ||
             (route.vehicleId && t.vehicleId === route.vehicleId))
        );
        if (conflict) return Promise.resolve({ status: 409, reason: 'conflict', data: conflict });

        const newTrip = {
            id: Date.now(),
            routeId: route.id,
            routeName: route.name,
            driverId: route.driverId,
            driverName: route.driverName,
            vehicleId: route.vehicleId,
            vehiclePlate: route.vehiclePlate,
            studentIds: route.studentIds || [],
            studentsTotal: (route.studentIds || []).length,
            studentsBoarded: 0,
            tripType: route.type,
            scheduledDate: date,
            scheduledStartTime: route.scheduledStartTime,
            status: 'SCHEDULED',
            startTime: null,
            endTime: null,
            currentStop: null,
            currentLocation: null,
            organizationId: route.organizationId,
        };

        saveExtra(newTrip);
        const iKey = incidentsKey();
        const incidents = JSON.parse(localStorage.getItem(iKey) || '[]');
        incidents.push({
            id: `i-${Date.now()}-auto`,
            tripId: newTrip.id,
            routeId: route.id,
            routeName: route.name,
            type: 'OTRO',
            severity: 'LOW',
            description: `Registro de incidencias para el viaje del ${date} - ${route.name}`,
            reportedBy: 'SYSTEM',
            timestamp: new Date().toISOString(),
            status: 'OPEN',
            organizationId: route.organizationId || getCurrentOrgId() || 'default',
        });
        localStorage.setItem(iKey, JSON.stringify(incidents));

        return Promise.resolve({ status: 201, data: newTrip });
    }
}
