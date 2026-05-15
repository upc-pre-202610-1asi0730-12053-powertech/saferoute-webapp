import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";
import seedData from '../../server/db.json';

const endpointPath = import.meta.env.VITE_TRIP_ENDPOINT_PATH;
const useFakeAuth  = String(import.meta.env.VITE_USE_FAKE_AUTH).toLowerCase() === 'true';

function getCurrentOrgId() {
    try { return JSON.parse(localStorage.getItem('saferoute.user') || '{}').organizationId || null; }
    catch { return null; }
}

// Scoped localStorage keys — each org gets its own namespace
function extraKey()     { return `saferoute.mock.trips.extra.${getCurrentOrgId() || 'default'}`; }
function stateKey()     { return `saferoute.mock.trips.state.${getCurrentOrgId() || 'default'}`; }
function incidentsKey() { return `saferoute.incidents.${getCurrentOrgId() || 'default'}`; }

function getExtra() { return JSON.parse(localStorage.getItem(extraKey()) || '[]'); }
function getState() { return JSON.parse(localStorage.getItem(stateKey()) || '{}'); }

/** Returns seed trips + extras filtered by org, with any persisted patches applied */
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

/** Persist a partial update for a trip-execution-and-monitoring id */
function patchState(id, partial) {
    const state = getState();
    state[id] = { ...(state[id] || {}), ...partial };
    localStorage.setItem(stateKey(), JSON.stringify(state));
}

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

export class TripApi extends BaseApi {
    #tripsEndpoint;

    constructor() {
        super();
        this.#tripsEndpoint = new BaseEndpoint(this, endpointPath);
    }

    getTrips(organizationId) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockTrips(organizationId) });
        return organizationId
            ? this.http.get(`${endpointPath}?organizationId=${organizationId}`)
            : this.#tripsEndpoint.getAll();
    }

    getTripById(id) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: mockTrips().find(t => t.id === id) ?? null });
        return this.#tripsEndpoint.getById(id);
    }

    createTrip(resource) {
        if (useFakeAuth) {
            const newTrip = { ...resource, id: Date.now() };
            saveExtra(newTrip);
            return Promise.resolve({ status: 201, data: newTrip });
        }
        return this.#tripsEndpoint.create(resource);
    }

    /** Persists a full trip-execution-and-monitoring update into localStorage state map */
    updateTrip(resource) {
        if (useFakeAuth) {
            patchState(resource.id, resource);
            return Promise.resolve({ status: 200, data: resource });
        }
        return this.#tripsEndpoint.update(resource.id, resource);
    }

    deleteTrip(id) {
        if (useFakeAuth) return Promise.resolve({ status: 200, data: {} });
        return this.#tripsEndpoint.delete(id);
    }

    startTrip(request) {
        if (useFakeAuth) {
            const newTrip = { ...request, id: Date.now(), tripState: 'EN_ROUTE', status: 'EN_ROUTE', startTime: new Date().toISOString() };
            saveExtra(newTrip);
            return Promise.resolve({ status: 201, data: newTrip });
        }
        return this.#tripsEndpoint.create({ ...request, tripState: 'EN_ROUTE' });
    }

    completeTrip(id) {
        const patch = { tripState: 'COMPLETED', status: 'COMPLETED', endTime: new Date().toISOString() };
        if (useFakeAuth) {
            patchState(id, patch);
            const found = mockTrips().find(t => String(t.id) === String(id));
            return Promise.resolve({ status: 200, data: found ? { ...found, ...patch } : patch });
        }
        return this.http.patch(`${endpointPath}/${id}`, patch);
    }

    updateBoardingStatus(tripId, request) {
        if (useFakeAuth) {
            return Promise.resolve({ status: 200, data: { tripId, ...request, boardedAt: new Date().toISOString() } });
        }
        return this.http.patch(`${endpointPath}/${tripId}/boarding`, request);
    }

    getAttendancesByTrip(tripId) {
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
        return this.http.get(`${endpointPath}/${tripId}/attendances`);
    }

    reportIncident(tripId, request) {
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
        return this.http.post(`${endpointPath}/${tripId}/incidents`, request);
    }

    getIncidentsByTrip(tripId) {
        if (useFakeAuth) {
            const iKey = incidentsKey();
            const all = JSON.parse(localStorage.getItem(iKey) || '[]');
            const filtered = all.filter(i => String(i.tripId) === String(tripId));
            return Promise.resolve({ status: 200, data: filtered });
        }
        return this.http.get(`${endpointPath}/${tripId}/incidents`);
    }

    /**
     * Auto-generate a scheduled trip-execution-and-monitoring from a complete fleet-and-route-planning.
     * Returns:
     *   { status: 201, data: newTrip }              — created OK
     *   { status: 409, reason: 'duplicate', data }  — trip-execution-and-monitoring already exists for same fleet-and-route-planning/date/time
     *   { status: 409, reason: 'conflict',  data }  — driver or vehicle busy at same date/time
     */
    autoCreateTripForRoute(route, scheduledDate) {
        if (!useFakeAuth) {
            return this.#tripsEndpoint.create({ routeId: route.id, scheduledDate });
        }

        const date = scheduledDate || todayISO();
        const all  = mockTrips();

        // ── Duplicate check: same fleet-and-route-planning + date + time, not cancelled ──────────
        const dup = all.find(t =>
            String(t.routeId) === String(route.id) &&
            t.scheduledDate   === date &&
            t.scheduledStartTime === route.scheduledStartTime &&
            t.status !== 'CANCELLED'
        );
        if (dup) return Promise.resolve({ status: 409, reason: 'duplicate', data: dup });

        // ── Conflict check: same driver OR vehicle, same date+time, active ────
        const conflict = all.find(t =>
            t.scheduledDate      === date &&
            t.scheduledStartTime === route.scheduledStartTime &&
            ['SCHEDULED', 'EN_ROUTE'].includes(t.status) &&
            (t.driverId === route.driverId ||
             (route.vehicleId && t.vehicleId === route.vehicleId))
        );
        if (conflict) return Promise.resolve({ status: 409, reason: 'conflict', data: conflict });

        // ── Create ─────────────────────────────────────────────────────────────
        const newTrip = {
            id:                  Date.now(),
            routeId:             route.id,
            routeName:           route.name,
            driverId:            route.driverId,
            driverName:          route.driverName,
            vehicleId:           route.vehicleId,
            vehiclePlate:        route.vehiclePlate,
            studentIds:          route.studentIds  || [],
            studentsTotal:       (route.studentIds || []).length,
            studentsBoarded:     0,
            tripType:            route.type,
            scheduledDate:       date,
            scheduledStartTime:  route.scheduledStartTime,
            status:              'SCHEDULED',
            startTime:           null,
            endTime:             null,
            currentStop:         null,
            currentLocation:     null,
            organizationId:      route.organizationId,
        };

        saveExtra(newTrip);
        // Auto-create a blank incident instance linked to this trip-execution-and-monitoring
        const iKey = incidentsKey();
        const incidents = JSON.parse(localStorage.getItem(iKey) || '[]');
        incidents.push({
            id:             `i-${Date.now()}-auto`,
            tripId:         newTrip.id,
            routeId:        route.id,
            routeName:      route.name,
            type:           'OTRO',
            severity:       'LOW',
            description:    `Registro de incidencias para el viaje del ${date} — ${route.name}`,
            reportedBy:     'SYSTEM',
            timestamp:      new Date().toISOString(),
            status:         'OPEN',
            organizationId: route.organizationId || getCurrentOrgId() || 'default',
        });
        localStorage.setItem(iKey, JSON.stringify(incidents));

        return Promise.resolve({ status: 201, data: newTrip });
    }
}
