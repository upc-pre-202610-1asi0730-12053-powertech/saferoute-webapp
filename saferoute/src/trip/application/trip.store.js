import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {TripApi} from "../infrastructure/trip-api.js";
import {TripAssembler} from "../infrastructure/trip.assembler.js";

const api = new TripApi();

export const useTripStore = defineStore('trip', () => {
    const trips = ref([]);
    const errors = ref([]);
    const loaded = ref(false);

    const count = computed(() => loaded.value ? trips.value.length : 0);

    function fetchTrips() {
        api.getTrips().then(response => {
            trips.value = TripAssembler.toEntitiesFromResponse(response);
            loaded.value = true;
        }).catch(error => errors.value.push(error));
    }

    function getTripById(id) {
        let idNum = parseInt(id);
        return trips.value.find(t => t.id === idNum);
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

    return { trips, errors, loaded, count, fetchTrips, getTripById, addTrip, updateTrip, deleteTrip }
});
