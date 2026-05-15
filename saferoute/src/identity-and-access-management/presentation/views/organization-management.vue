<script setup>
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useIamStore } from "../../application/iam.store.js";
import OrganizationProfile from "../components/organization-profile.vue";
import OrganizationForm from "../components/organization-form.vue";

const { t } = useI18n();
const store = useIamStore();

const editing = ref(false);

onMounted(async () => {
  if (store.currentUser?.organizationId && !store.organization) {
    await store.loadOrganization(store.currentUser.organizationId);
  }
});

const onEditRequested = () => { editing.value = true; };
const onSuspendRequested = (org) => {
  
  console.warn('Suspend requested for', org?.id);
};
const onUpdated = () => { editing.value = false; };
</script>

<template>
  <div class="org-management-view p-4">
    <h1>{{ t('identity-and-access-management.organization-management.title') }}</h1>

    <p v-if="!store.organization">{{ t('identity-and-access-management.organization-management.empty') }}</p>

    <organization-profile v-else-if="!editing"
                          :organization="store.organization"
                          @edit-requested="onEditRequested"
                          @suspend-requested="onSuspendRequested"/>

    <organization-form v-else
                       :initial-organization="store.organization"
                       @organization-updated="onUpdated"/>
  </div>
</template>
