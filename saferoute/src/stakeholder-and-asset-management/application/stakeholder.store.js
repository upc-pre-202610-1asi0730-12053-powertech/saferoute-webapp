import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {StakeholderApi} from "../infrastructure/stakeholder-api.js";
import {ProfileAssembler} from "../infrastructure/profile.assembler.js";
import {ParentAssembler} from "../infrastructure/parent.assembler.js";
import {DriverAssembler} from "../infrastructure/driver.assembler.js";
import {ChildAssembler} from "../infrastructure/child.assembler.js";
import {StudentGroupAssembler} from "../infrastructure/student-group.assembler.js";

const api = new StakeholderApi();

/**
 * Application store for the Stakeholder bounded context.
 * Matches StakeholderStore in vue-saferoute-stakeholder.puml.
 *
 * State: parents, drivers, children, groups (+ backward-compat profiles)
 */
export const useStakeholderStore = defineStore('stakeholder-and-asset-management', () => {
    // ─── Diagram state ───────────────────────────────────────────────────────
    const parents  = ref([]);
    const drivers  = ref([]);
    const children = ref([]);
    const groups   = ref([]);

    // ─── Backward-compatible state ───────────────────────────────────────────
    const profiles = ref([]);
    const errors   = ref([]);
    const loaded   = ref(false);

    const count = computed(() => loaded.value ? profiles.value.length : 0);

    async function loadParents(organizationId) {
        try {
            const response = await api.getParentsByOrganization(organizationId);
            parents.value = ParentAssembler.toEntitiesFromResponse(response);
        } catch (error) { errors.value.push(error); }
    }

    async function loadDrivers(organizationId) {
        try {
            const response = await api.getDriversByOrganization(organizationId);
            drivers.value = DriverAssembler.toEntitiesFromResponse(response);
        } catch (error) { errors.value.push(error); }
    }

    async function loadChildren(parentId) {
        try {
            const response = await api.getChildrenByParent(parentId);
            children.value = ChildAssembler.toEntitiesFromResponse(response);
        } catch (error) { errors.value.push(error); }
    }

    async function loadGroups(organizationId) {
        try {
            const response = await api.getGroupsByOrganization(organizationId);
            groups.value = StudentGroupAssembler.toEntitiesFromResponse(response);
        } catch (error) { errors.value.push(error); }
    }

    async function createParent(request) {
        try {
            const response = await api.createParent(request);
            const newParent = ParentAssembler.toEntityFromResource(response.data);
            parents.value.push(newParent);
            return newParent;
        } catch (error) { errors.value.push(error); return null; }
    }

    async function createDriver(request) {
        try {
            const response = await api.createDriver(request);
            const newDriver = DriverAssembler.toEntityFromResource(response.data);
            drivers.value.push(newDriver);
            return newDriver;
        } catch (error) { errors.value.push(error); return null; }
    }

    async function createChild(request) {
        try {
            const response = await api.createChild(request);
            const newChild = ChildAssembler.toEntityFromResource(response.data);
            children.value.push(newChild);
            return newChild;
        } catch (error) { errors.value.push(error); return null; }
    }

    async function createGroup(request) {
        try {
            const response = await api.createStudentGroup(request);
            const newGroup = StudentGroupAssembler.toEntityFromResource(response.data);
            groups.value.push(newGroup);
            return newGroup;
        } catch (error) { errors.value.push(error); return null; }
    }

    async function finalizeGroup(groupId) {
        try {
            await api.finalizeGroup(groupId);
            const idx = groups.value.findIndex(g => g.id === groupId);
            if (idx !== -1) groups.value[idx].isFinalized = true;
        } catch (error) { errors.value.push(error); }
    }

    // ─── Backward-compatible methods (used by existing views) ────────────────

    function fetchProfiles(organizationId) {
        loaded.value = false;
        api.getProfiles(organizationId).then(response => {
            profiles.value = ProfileAssembler.toEntitiesFromResponse(response);
            loaded.value = true;
        }).catch(error => errors.value.push(error));
    }

    function getProfileById(id) {
        return profiles.value.find(p => String(p.id) === String(id));
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
        // diagram state
        parents, drivers, children, groups,
        profiles, errors, loaded, count,
        // diagram methods
        loadParents, loadDrivers, loadChildren, loadGroups,
        createParent, createDriver, createChild, createGroup, finalizeGroup,
        fetchProfiles, getProfileById, addProfile, updateProfile, deleteProfile
    }
});
