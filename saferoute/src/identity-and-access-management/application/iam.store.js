import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {IamApi} from "../infrastructure/iam-api.js";
import {UserAssembler} from "../infrastructure/user.assembler.js";

const api = new IamApi();

export const useIamStore = defineStore('iam', () => {
    const users = ref([]);
    const errors = ref([]);
    const loaded = ref(false);

    const count = computed(() => loaded.value ? users.value.length : 0);

    function fetchUsers() {
        api.getUsers().then(response => {
            users.value = UserAssembler.toEntitiesFromResponse(response);
            loaded.value = true;
        }).catch(error => errors.value.push(error));
    }

    function getUserById(id) {
        let idNum = parseInt(id);
        return users.value.find(u => u.id === idNum);
    }

    function addUser(user) {
        api.createUser(user).then(response => {
            const newUser = UserAssembler.toEntityFromResource(response.data);
            users.value.push(newUser);
        }).catch(error => errors.value.push(error));
    }

    function updateUser(user) {
        api.updateUser(user).then(response => {
            const updatedUser = UserAssembler.toEntityFromResource(response.data);
            const index = users.value.findIndex(u => u.id === updatedUser.id);
            if (index !== -1) users.value[index] = updatedUser;
        }).catch(error => errors.value.push(error));
    }

    function deleteUser(user) {
        api.deleteUser(user.id).then(() => {
            const index = users.value.findIndex(u => u.id === user.id);
            if (index !== -1) users.value.splice(index, 1);
        }).catch(error => errors.value.push(error));
    }

    return { users, errors, loaded, count, fetchUsers, getUserById, addUser, updateUser, deleteUser }
});
