<script setup>
import {useI18n} from "vue-i18n";
import {useRoute, useRouter} from "vue-router";
import {useIamStore} from "../../application/iam.store.js";
import {computed, onMounted, ref} from "vue";
import {User} from "../../domain/model/user.entity.js";

const {t} = useI18n();
const route = useRoute();
const router = useRouter();
const store = useIamStore();

const form = ref({username: '', email: '', roles: ''});
const isEdit = computed(() => !!route.params.id);

onMounted(() => {
  if (isEdit.value) {
    const userItem = store.getUserById(route.params.id);
    if (userItem) {
      form.value.username = userItem.username;
      form.value.email = userItem.email;
      form.value.roles = userItem.roles;
    } else router.push({name: 'identity-and-access-management-users'});
  }
});

const saveUser = () => {
  const userItem = new User({
    id: isEdit.value ? route.params.id : null,
    username: form.value.username,
    email: form.value.email,
    roles: form.value.roles,
  });
  if (isEdit.value) store.updateUser(userItem); else store.addUser(userItem);
  router.push({name: 'identity-and-access-management-users'});
};
</script>

<template>
  <div class="p-4">
    <h1>{{ isEdit ? 'Edit User' : 'New User' }}</h1>
    <form @submit.prevent="saveUser">
      <div class="field mb-3">
        <label for="username">Username</label>
        <pv-input-text id="username" v-model="form.username" class="w-full" required/>
      </div>
      <div class="field mb-3">
        <label for="email">Email</label>
        <pv-input-text id="email" v-model="form.email" type="email" class="w-full" required/>
      </div>
      <div class="field mb-3">
        <label for="roles">Roles</label>
        <pv-input-text id="roles" v-model="form.roles" class="w-full" required/>
      </div>
      <pv-button label="Save" icon="pi pi-save" type="submit"/>
      <pv-button label="Cancel" class="ml-2" severity="secondary" @click="router.push({name: 'identity-and-access-management-users'})"/>
    </form>
    <div v-if="store.errors.length" class="text-red-500 mt-3">
      {{ store.errors.map(e => e.message).join(', ') }}
    </div>
  </div>
</template>
