import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {SubscriptionApi} from "../infrastructure/subscription-api.js";
import {PlanAssembler} from "../infrastructure/plan.assembler.js";

const api = new SubscriptionApi();

export const useSubscriptionStore = defineStore('subscription', () => {
    const plans = ref([]);
    const errors = ref([]);
    const loaded = ref(false);

    const count = computed(() => loaded.value ? plans.value.length : 0);

    function fetchPlans() {
        api.getPlans().then(response => {
            plans.value = PlanAssembler.toEntitiesFromResponse(response);
            loaded.value = true;
        }).catch(error => errors.value.push(error));
    }

    function getPlanById(id) {
        let idNum = parseInt(id);
        return plans.value.find(p => p.id === idNum);
    }

    function addPlan(plan) {
        api.createPlan(plan).then(response => {
            const newPlan = PlanAssembler.toEntityFromResource(response.data);
            plans.value.push(newPlan);
        }).catch(error => errors.value.push(error));
    }

    function updatePlan(plan) {
        api.updatePlan(plan).then(response => {
            const updatedPlan = PlanAssembler.toEntityFromResource(response.data);
            const index = plans.value.findIndex(p => p.id === updatedPlan.id);
            if (index !== -1) plans.value[index] = updatedPlan;
        }).catch(error => errors.value.push(error));
    }

    function deletePlan(plan) {
        api.deletePlan(plan.id).then(() => {
            const index = plans.value.findIndex(p => p.id === plan.id);
            if (index !== -1) plans.value.splice(index, 1);
        }).catch(error => errors.value.push(error));
    }

    return { plans, errors, loaded, count, fetchPlans, getPlanById, addPlan, updatePlan, deletePlan }
});
