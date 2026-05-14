import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {RouteApi} from "../infrastructure/route-api.js";
import {RouteAssembler} from "../infrastructure/route.assembler.js";

const api = new RouteApi();

export const useRouteStore = defineStore('route', () => {
    const routes = ref([]);
    const errors = ref([]);
    const loaded = ref(false);

    const count = computed(() => loaded.value ? routes.value.length : 0);

    function fetchRoutes() {
        api.getRoutes().then(response => {
            routes.value = RouteAssembler.toEntitiesFromResponse(response);
            loaded.value = true;
        }).catch(error => errors.value.push(error));
    }

    function getRouteById(id) {
        let idNum = parseInt(id);
        return routes.value.find(r => r.id === idNum);
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
        routes, errors, loaded, count,
        fetchRoutes, getRouteById, addRoute, updateRoute, deleteRoute
    }
});
