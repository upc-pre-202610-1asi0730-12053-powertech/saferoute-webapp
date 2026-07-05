<script setup>
/**
 * NavBar component — shared.presentation.components.NavBar
 *
 * Renders the sidebar navigation items and handles sign-out.
 * Corresponds to the NavBar class in vue-saferoute-shared.puml.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useIamStore } from '../../../identity-and-access-management/application/iam.store.js';

const { t }    = useI18n();
const router   = useRouter();
const iamStore = useIamStore();

const currentUser     = computed(() => iamStore.currentUser);
const isAuthenticated = computed(() => iamStore.isAuthenticated);

const adminItems = [
  { label: 'option.home',         to: '/home',                                    icon: 'pi pi-home'        },
  { label: 'option.community',    to: '/stakeholder-and-asset-management/management',   icon: 'pi pi-users'       },
  { label: 'option.student-groups', to: '/stakeholder-and-asset-management/student-groups', icon: 'pi pi-sitemap' },
  { label: 'option.routes',       to: '/fleet-and-route-planning/management',         icon: 'pi pi-map-marker'  },
  { label: 'option.trips',        to: '/trip-execution-and-monitoring/monitor',             icon: 'pi pi-car'         },
  { label: 'option.subscription-and-plan-management', to: '/subscription-and-plan-management/status',      icon: 'pi pi-credit-card' },
  { label: 'option.alerts',       to: '/notifications-and-communication/alerts',      icon: 'pi pi-bell'        },
  { label: 'option.profile',      to: '/identity-and-access-management/profile',              icon: 'pi pi-user'        },
];

const driverItems = [
  { label: 'option.home',    to: '/home',                                 icon: 'pi pi-home'  },
  { label: 'option.trips',   to: '/trip-execution-and-monitoring/active',         icon: 'pi pi-car'   },
  { label: 'option.alerts',  to: '/notifications-and-communication/alerts', icon: 'pi pi-bell'  },
  { label: 'option.profile', to: '/identity-and-access-management/profile',         icon: 'pi pi-user'  },
];

const parentItems = [
  { label: 'option.home',     to: '/home',                                  icon: 'pi pi-home' },
  { label: 'option.tracking', to: '/trip-execution-and-monitoring/tracking',       icon: 'pi pi-map'  },
  { label: 'option.alerts',   to: '/notifications-and-communication/alerts', icon: 'pi pi-bell' },
  { label: 'option.profile',  to: '/identity-and-access-management/profile',         icon: 'pi pi-user' },
];

const navItems = computed(() => {
  if (!isAuthenticated.value) return [];
  const role = currentUser.value?.roleTier;
  if (role === 'ADMIN')  return adminItems;
  if (role === 'DRIVER') return driverItems;
  if (role === 'PARENT') return parentItems;
  return [{ label: 'option.home', to: '/home', icon: 'pi pi-home' }];
});

function navigateTo(routePath) {
  router.push(routePath);
}

function logout() {
  iamStore.signOut();
  router.push({ name: 'iam-sign-in' });
}

defineExpose({ navigateTo, logout });
</script>

<template>
  <nav class="sidebar-nav">
    <router-link
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      @click="navigateTo(item.to)">
      <i :class="item.icon"/>
      <span>{{ t(item.label) }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.sidebar-nav {
  flex: 1;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
  border-left: 3px solid transparent;
}
.nav-item:hover {
  background: rgba(255,255,255,0.08);
  color: var(--white);
}
.nav-item.router-link-active {
  background: rgba(245,166,35,0.15);
  color: var(--white);
  border-left-color: var(--amber);
}
.nav-item i { width: 1.1rem; text-align: center; font-size: 1rem; }
</style>
