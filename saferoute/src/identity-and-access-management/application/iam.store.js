
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { IamApi } from "../infrastructure/iam-api.js";
import { UserAssembler } from "../infrastructure/user.assembler.js";
import { OrganizationAssembler } from "../infrastructure/organization.assembler.js";
import { User } from "../domain/model/user.entity.js";

const iamApi = new IamApi();

const TOKEN_STORAGE_KEY = 'saferoute.token';
const USER_STORAGE_KEY  = 'saferoute.user';

/**
 * Reactive store that exposes IAM commands and queries.
 * @returns {Object} Store state and actions.
 */
export const useIamStore = defineStore('identity-and-access-management', () => {
    /** @type {import('vue').Ref<?User>} */
    const currentUser = ref(loadStoredUser());
    /** @type {import('vue').Ref<?import('../domain/model/organization.entity.js').Organization>} */
    const organization = ref(null);
    /** @type {import('vue').Ref<?string>} */
    const token = ref(localStorage.getItem(TOKEN_STORAGE_KEY));
    /** @type {import('vue').Ref<Error[]>} */
    const errors = ref([]);
    /** @type {import('vue').Ref<boolean>} */
    const loading = ref(false);

    /** @type {import('vue').ComputedRef<boolean>} */
    const isAuthenticated = computed(() => !!token.value && !!currentUser.value);
    /** @type {import('vue').ComputedRef<boolean>} */
    const isAdmin = computed(() => !!currentUser.value && currentUser.value.roleTier === 'ADMIN');

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function loadStoredUser() {
        const raw = localStorage.getItem(USER_STORAGE_KEY);
        if (!raw) return null;
        try { return new User(JSON.parse(raw)); }
        catch { return null; }
    }

    function persistSession(newToken, user) {
        token.value = newToken;
        currentUser.value = user;
        if (newToken) localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
        if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
            id: user.id, firstName: user.firstName, lastName: user.lastName,
            email: user.email, roleTier: user.roleTier, organizationId: user.organizationId
        }));
    }

    function clearSession() {
        token.value = null;
        currentUser.value = null;
        organization.value = null;
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
    }

    /**
     * Normalizes the response from either json-server or the real backend.
     * @param {Object} data - Raw response data.
     * @returns {{token: string, userResource: ?Object}}
     */
    function parseSignInResponse(data) {

        if (Array.isArray(data)) {
            if (data.length === 0) return { token: null, userResource: null };
            return { token: `dev-token-${data[0].id}`, userResource: data[0] };
        }

        if (data && typeof data === 'object') {
            const userResource = data.user || data;
            const token = data.token || data.accessToken || `dev-token-${userResource.id}`;
            return { token, userResource };
        }
        return { token: null, userResource: null };
    }

    // ─── Authentication actions ──────────────────────────────────────────────

    /**
     * Signs the user in. On success persists token + user and returns the User entity.
     * @param {string} email
     * @param {string} password
     * @returns {Promise<?User>}
     */
    async function signIn(email, password) {
        loading.value = true;
        try {
            const response = await iamApi.signIn(email, password);
            const { token: newToken, userResource } = parseSignInResponse(response.data);

            if (!userResource || !newToken) {
                errors.value.push(new Error('Invalid credentials'));
                return null;
            }

            const user = UserAssembler.toEntityFromResource(userResource);
            persistSession(newToken, user);
            return user;
        } catch (error) {
            errors.value.push(error);
            return null;
        } finally {
            loading.value = false;
        }
    }

    /** Clears the local session. */
    function signOut() { clearSession(); }

    /**
     * Registers a new admin user.
     * @param {Object} request - { firstName, lastName, email, password, organizationId }
     * @returns {Promise<?User>}
     */
    async function registerAdmin(request) {
        loading.value = true;
        try {
            const payload = { ...request, roleTier: 'ADMIN' };
            const response = await iamApi.registerUser(payload);
            return UserAssembler.toEntityFromResource(response.data);
        } catch (error) {
            errors.value.push(error);
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Registers a regular user (Padre or Conductor).
     * @param {Object} request - { firstName, lastName, email, password, roleTier, organizationId }
     * @returns {Promise<?User>}
     */
    async function registerUser(request) {
        loading.value = true;
        try {
            const response = await iamApi.registerUser(request);
            return UserAssembler.toEntityFromResource(response.data);
        } catch (error) {
            errors.value.push(error);
            return null;
        } finally {
            loading.value = false;
        }
    }

    // ─── Organization actions ────────────────────────────────────────────────

    /** @param {string|number} id */
    async function loadOrganization(id) {
        loading.value = true;
        try {
            const response = await iamApi.getOrganizationById(id);
            organization.value = OrganizationAssembler.toEntityFromResource(response.data);
        } catch (error) {
            errors.value.push(error);
        } finally {
            loading.value = false;
        }
    }

    /**
     * @param {Object} request - { name }
     * @returns {Promise<?import('../domain/model/organization.entity.js').Organization>}
     */
    async function createOrganization(request) {
        loading.value = true;
        try {
            const payload = {
                ...request,
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
            };
            const response = await iamApi.createOrganization(payload);
            const created = OrganizationAssembler.toEntityFromResource(response.data);
            organization.value = created;
            return created;
        } catch (error) {
            errors.value.push(error);
            return null;
        } finally {
            loading.value = false;
        }
    }

    return {
        // state
        currentUser, organization, token, errors, loading,
        // getters
        isAuthenticated, isAdmin,
        // actions
        signIn, signOut, registerAdmin, registerUser, loadOrganization, createOrganization
    };
});

export default useIamStore;
