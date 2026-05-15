/**
 * Application service store for the Fleet bounded context.
 * Matches FleetStore in vue-saferoute-fleet.puml.
 *
 * State:  routes, stops, vehicles, assignments
 * Methods: loadRoutes, loadStops, loadVehicles, createRoute, activateRoute,
 *          createVehicle, createAssignment
 *
 * Also exposes backward-compatible methods used by existing views.
 *
 * @module useFleetStore
 */
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { FleetApi } from "../infrastructure/fleet-api.js";
import { RouteAssembler } from "../infrastructure/route.assembler.js";
import { StopAssembler } from "../infrastructure/stop.assembler.js";
import { VehicleAssembler } from "../infrastructure/vehicle.assembler.js";
import { AssignmentAssembler } from "../infrastructure/assignment.assembler.js";

const api = new FleetApi();

export const useFleetStore = defineStore('fleet', () => {
    // ─── State (diagram) ─────────────────────────────────────────────────────
    const routes      = ref([]);
    const stops       = ref([]);
    const vehicles    = ref([]);
    const assignments = ref([]);
    const errors      = ref([]);
    const loaded      = ref(false);

    const count = computed(() => loaded.value ? routes.value.length : 0);

    async function loadRoutes(organizationId) {
        try {
            const response = organizationId
                ? await api.getRoutesByOrganization(organizationId)
                : await api.getRoutes();
            routes.value = RouteAssembler.toEntitiesFromResponse(response);
            loaded.value = true;
        } catch (error) {
            errors.value.push(error);
        }
    }

    async function loadStops(routeId) {
        try {
            const response = await api.getStopsByRoute(routeId);
            stops.value = StopAssembler.toEntitiesFromResponse(response);
        } catch (error) {
            errors.value.push(error);
        }
    }

    async function loadVehicles(organizationId) {
        try {
            const response = await api.getVehiclesByOrganization(organizationId);
            vehicles.value = VehicleAssembler.toEntitiesFromResponse(response);
        } catch (error) {
            errors.value.push(error);
        }
    }

    async function createRoute(request) {
        try {
            const response = await api.createRoute(request);
            const newRoute = RouteAssembler.toEntityFromResource(response.data);
            routes.value.push(newRoute);
            return newRoute;
        } catch (error) {
            errors.value.push(error);
            return null;
        }
    }

    async function activateRoute(id) {
        try {
            await api.activateRoute(id);
            const idx = routes.value.findIndex(r => String(r.id) === String(id));
            if (idx !== -1) routes.value[idx].routeState = 'ACTIVE';
        } catch (error) {
            errors.value.push(error);
        }
    }

    async function createVehicle(request) {
        try {
            const response = await api.createVehicle(request);
            const newVehicle = VehicleAssembler.toEntityFromResource(response.data);
            vehicles.value.push(newVehicle);
            return newVehicle;
        } catch (error) {
            errors.value.push(error);
            return null;
        }
    }

    async function createAssignment(request) {
        try {
            const response = await api.createAssignment(request);
            const newAssignment = AssignmentAssembler.toEntityFromResource(response.data);
            assignments.value.push(newAssignment);
            return newAssignment;
        } catch (error) {
            errors.value.push(error);
            return null;
        }
    }

    // ─── Backward-compatible methods (used by existing views) ────────────────

    function fetchRoutes(organizationId) {
        loaded.value = false;
        api.getRoutes(organizationId).then(response => {
            routes.value = RouteAssembler.toEntitiesFromResponse(response);
            loaded.value = true;
        }).catch(error => errors.value.push(error));
    }

    function getRouteById(id) {
        let idNum = parseInt(id);
        return routes.value.find(r => r.id === idNum || r.id === id);
    }

    function addRoute(route) {
        api.createRoute(route).then(response => {
            const newRoute = RouteAssembler.toEntityFromResource(response.data);
            routes.value.push(newRoute);
        }).catch(error => errors.value.push(error));
    }

    function updateRoute(route) {
        api.updateRoute(route).then(response => {
            const updatedRoute = RouteAssembler.toEntityFromResource(response.data);
            const index = routes.value.findIndex(r => r.id === updatedRoute.id);
            if (index !== -1) routes.value[index] = updatedRoute;
        }).catch(error => errors.value.push(error));
    }

    function deleteRoute(route) {
        api.deleteRoute(route.id).then(() => {
            const index = routes.value.findIndex(r => r.id === route.id);
            if (index !== -1) routes.value.splice(index, 1);
        }).catch(error => errors.value.push(error));
    }

    return {
        // state
        routes, stops, vehicles, assignments, errors, loaded, count,
        // diagram methods
        loadRoutes, loadStops, loadVehicles, createRoute, activateRoute, createVehicle, createAssignment,
        fetchRoutes, getRouteById, addRoute, updateRoute, deleteRoute
    };
});

/**
 * Backward-compatible alias — existing views import useRouteStore.
 */
export const useRouteStore = useFleetStore;
