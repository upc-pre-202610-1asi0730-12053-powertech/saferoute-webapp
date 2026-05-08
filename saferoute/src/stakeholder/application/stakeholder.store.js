import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {StakeholderApi} from "../infrastructure/stakeholder-api.js";
import {ProfileAssembler} from "../infrastructure/profile.assembler.js";

const api = new StakeholderApi();

export const useStakeholderStore = defineStore('stakeholder', () => {
    const profiles = ref([]);
    const errors = ref([]);
    const loaded = ref(false);

    const count = computed(() => loaded.value ? profiles.value.length : 0);

    function fetchProfiles() {
        api.getProfiles().then(response => {
            profiles.value = ProfileAssembler.toEntitiesFromResponse(response);
            loaded.value = true;
        }).catch(error => errors.value.push(error));
    }

    function getProfileById(id) {
        let idNum = parseInt(id);
        return profiles.value.find(p => p.id === idNum);
    }

    function addProfile(profile) {
        api.createProfile(profile).then(response => {
            const newProfile = ProfileAssembler.toEntityFromResource(response.data);
            profiles.value.push(newProfile);
        }).catch(error => errors.value.push(error));
    }

    function updateProfile(profile) {
        api.updateProfile(profile).then(response => {
            const updatedProfile = ProfileAssembler.toEntityFromResource(response.data);
            const index = profiles.value.findIndex(p => p.id === updatedProfile.id);
            if (index !== -1) profiles.value[index] = updatedProfile;
        }).catch(error => errors.value.push(error));
    }

    function deleteProfile(profile) {
        api.deleteProfile(profile.id).then(() => {
            const index = profiles.value.findIndex(p => p.id === profile.id);
            if (index !== -1) profiles.value.splice(index, 1);
        }).catch(error => errors.value.push(error));
    }

    return {
        profiles, errors, loaded, count,
        fetchProfiles, getProfileById, addProfile, updateProfile, deleteProfile
    }
});
