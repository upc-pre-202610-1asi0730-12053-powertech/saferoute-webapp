import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {TripApi} from "../infrastructure/trip-api.js";
import {TripAssembler} from "../infrastructure/trip.assembler.js";
import {AttendanceAssembler} from "../infrastructure/attendance.assembler.js";
import {IncidentAssembler} from "../infrastructure/incident.assembler.js";

const api = new TripApi();

/**
 * Application store for the Trip bounded context.
 * Matches TripStore in vue-saferoute-trip.puml.
 *
 * State: currentTrip, attendances, incidents (+ backward-compat trips)
 */
export const useTripStore = defineStore('trip-execution-and-monitoring', () => {
    // ─── Diagram state ───────────────────────────────────────────────────────
    const currentTrip  = ref(null);
    const attendances  = ref([]);
    const incidents    = ref([]);

    // ─── Backward-compat state ───────────────────────────────────────────────
    const trips  = ref([]);
    const errors = ref([]);
    const loaded = ref(false);

    const count = computed(() => loaded.value ? trips.value.length : 0);

    async function startTrip(request) {
        try {
            const response = await api.startTrip(request);
            const newTrip = TripAssembler.toEntityFromResource(response.data);
            currentTrip.value = newTrip;
            trips.value.push(newTrip);
            return newTrip;
        } catch (error) { errors.value.push(error); return null; }
    }

    async function completeTrip(id) {
        try {
            const response = await api.completeTrip(id);
            const updated = TripAssembler.toEntityFromResource(response.data);
            currentTrip.value = updated;
            const idx = trips.value.findIndex(t => String(t.id) === String(id));
            if (idx !== -1) trips.value[idx] = updated;
        } catch (error) { errors.value.push(error); }
    }

    async function updateBoardingStatus(tripId, childId, state) {
        try {
            const response = await api.updateBoardingStatus(tripId, { childId, boardingState: state });
            const updated = AttendanceAssembler.toEntityFromResource(response.data);
            const idx = attendances.value.findIndex(a => a.childId === childId && String(a.tripId) === String(tripId));
            if (idx !== -1) attendances.value[idx] = updated;
            else attendances.value.push(updated);
        } catch (error) { errors.value.push(error); }
    }

    async function reportIncident(tripId, description) {
        try {
            const response = await api.reportIncident(tripId, { description });
            const newIncident = IncidentAssembler.toEntityFromResource(response.data);
            incidents.value.push(newIncident);
            return newIncident;
        } catch (error) { errors.value.push(error); return null; }
    }

    async function loadAttendances(tripId) {
        try {
            const response = await api.getAttendancesByTrip(tripId);
            attendances.value = AttendanceAssembler.toEntitiesFromResponse(response);
        } catch (error) { errors.value.push(error); }
    }

    async function loadIncidents(tripId) {
        try {
            const response = await api.getIncidentsByTrip(tripId);
            incidents.value = IncidentAssembler.toEntitiesFromResponse(response);
        } catch (error) { errors.value.push(error); }
    }

    // ─── Backward-compatible methods (used by existing views) ────────────────

    function fetchTrips(organizationId) {
        loaded.value = false;
        api.getTrips(organizationId).then(response => {
            trips.value = TripAssembler.toEntitiesFromResponse(response);
            loaded.value = true;
        }).catch(error => errors.value.push(error));
    }

    function getTripById(id) {
        let idNum = parseInt(id);
        return trips.value.find(t => t.id === idNum || t.id === id);
    }

    function addTrip(trip) {
        api.createTrip(trip).then(response => {
            const newTrip = TripAssembler.toEntityFromResource(response.data);
            trips.value.push(newTrip);
        }).catch(error => errors.value.push(error));
    }

    function updateTrip(trip) {
        api.updateTrip(trip).then(response => {
            const updatedTrip = TripAssembler.toEntityFromResource(response.data);
            const index = trips.value.findIndex(t => t.id === updatedTrip.id);
            if (index !== -1) trips.value[index] = updatedTrip;
        }).catch(error => errors.value.push(error));
    }

    function deleteTrip(trip) {
        api.deleteTrip(trip.id).then(() => {
            const index = trips.value.findIndex(t => t.id === trip.id);
            if (index !== -1) trips.value.splice(index, 1);
        }).catch(error => errors.value.push(error));
    }

    return {
        // diagram state
        currentTrip, attendances, incidents,
        trips, errors, loaded, count,
        // diagram methods
        startTrip, completeTrip, updateBoardingStatus, reportIncident, loadAttendances, loadIncidents,
        fetchTrips, getTripById, addTrip, updateTrip, deleteTrip
    }
});
