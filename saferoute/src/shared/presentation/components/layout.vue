<script setup>
import LanguageSwitcher from "./language-switcher.vue";
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useIamStore } from "../../../identity-and-access-management/application/iam.store.js";

const { t }    = useI18n();
const router   = useRouter();
const route    = useRoute();
const iamStore = useIamStore();

const hideNav    = computed(() => route.meta?.hideNav === true);
const menuOpen   = ref(false);

// Close burger menu on fleet-and-route-planning change
watch(() => route.path, () => { menuOpen.value = false; });

const adminItems = [
  { label: 'option.home',         to: '/home',                     icon: 'pi pi-home'        },
  { label: 'option.community',    to: '/stakeholder-and-asset-management/management',   icon: 'pi pi-users'       },
  { label: 'option.student-groups', to: '/stakeholder-and-asset-management/student-groups', icon: 'pi pi-sitemap' },
  { label: 'option.routes',       to: '/fleet-and-route-planning/management',         icon: 'pi pi-map-marker'  },
  { label: 'option.trips',        to: '/trip-execution-and-monitoring/monitor',             icon: 'pi pi-car'         },
  { label: 'option.subscription-and-plan-management', to: '/subscription-and-plan-management/status',      icon: 'pi pi-credit-card' },
  { label: 'option.alerts',       to: '/notifications-and-communication/alerts',      icon: 'pi pi-bell'        },
  { label: 'option.profile',      to: '/identity-and-access-management/profile',              icon: 'pi pi-user'        },
];

const driverItems = [
  { label: 'option.home',    to: '/home',                icon: 'pi pi-home'  },
  { label: 'option.trips',   to: '/trip-execution-and-monitoring/active',         icon: 'pi pi-car'   },
  { label: 'option.alerts',  to: '/notifications-and-communication/alerts', icon: 'pi pi-bell'  },
  { label: 'option.profile', to: '/identity-and-access-management/profile',         icon: 'pi pi-user'  },
];

const parentItems = [
  { label: 'option.home',     to: '/home',                icon: 'pi pi-home' },
  { label: 'option.tracking', to: '/trip-execution-and-monitoring/tracking',       icon: 'pi pi-map'  },
  { label: 'option.alerts',   to: '/notifications-and-communication/alerts', icon: 'pi pi-bell' },
  { label: 'option.profile',  to: '/identity-and-access-management/profile',         icon: 'pi pi-user' },
];

const navItems = computed(() => {
  if (!iamStore.isAuthenticated) return [];
  const role = iamStore.currentUser?.roleTier;
  if (role === 'ADMIN')  return adminItems;
  if (role === 'DRIVER') return driverItems;
  if (role === 'PARENT') return parentItems;
  return [{ label: 'option.home', to: '/home', icon: 'pi pi-home' }];
});

const roleLabel = computed(() => {
  const role = iamStore.currentUser?.roleTier;
  if (role === 'ADMIN')  return t('home.role.admin');
  if (role === 'DRIVER') return t('home.role.driver');
  if (role === 'PARENT') return t('home.role.parent');
  return '';
});

const onSignOut = () => {
  iamStore.signOut();
  router.push({ name: 'iam-sign-in' });
};
</script>

<template>
  <pv-toast/>
  <pv-confirm-dialog/>

  <!-- Auth pages: full screen without sidebar -->
  <template v-if="hideNav">
    <router-view/>
  </template>

  <!-- App layout -->
  <div v-else class="app-layout">

    <!-- ── Mobile top bar ──────────────────────────────────── -->
    <header class="mobile-topbar">
      <button class="burger-btn" @click="menuOpen = !menuOpen" :aria-expanded="menuOpen">
        <span class="burger-line" :class="{ open: menuOpen }"/>
        <span class="burger-line" :class="{ open: menuOpen }"/>
        <span class="burger-line" :class="{ open: menuOpen }"/>
      </button>
      <div class="topbar-logo">
        <i class="pi pi-shield topbar-logo-icon"/>
        <span class="topbar-logo-text">SafeRoute</span>
      </div>
      <div class="topbar-right">
        <language-switcher/>
      </div>
    </header>

    <!-- ── Backdrop (mobile) ───────────────────────────────── -->
    <div
      class="sidebar-backdrop"
      :class="{ visible: menuOpen }"
      @click="menuOpen = false"/>

    <!-- ── Sidebar ─────────────────────────────────────────── -->
    <aside class="sidebar" :class="{ 'sidebar-open': menuOpen }">
      <div class="sidebar-logo">
        <i class="pi pi-shield sidebar-logo-icon"/>
        <span class="sidebar-logo-text">SafeRoute</span>
        <!-- Close button (mobile) -->
        <button class="sidebar-close-btn" @click="menuOpen = false">
          <i class="pi pi-times"/>
        </button>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item">
          <i :class="item.icon"/>
          <span>{{ t(item.label) }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="language-row">
          <language-switcher/>
        </div>
        <div class="user-info">
          <div class="user-avatar">
            <i class="pi pi-user"/>
          </div>
          <div class="user-details">
            <span class="user-name">{{ iamStore.currentUser?.firstName }} {{ iamStore.currentUser?.lastName }}</span>
            <span class="user-role">{{ roleLabel }}</span>
          </div>
        </div>
        <button class="sign-out-btn" @click="onSignOut">
          <i class="pi pi-sign-out"/>
          <span>{{ t('option.sign-out') }}</span>
        </button>
      </div>
    </aside>

    <!-- ── Main content ────────────────────────────────────── -->
    <main class="main-area">
      <router-view/>
    </main>

  </div>
</template>

<style scoped>
/* ── Base layout ─────────────────────────────────────────────── */
.app-layout {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

/* ── Mobile topbar (hidden on desktop) ───────────────────────── */
.mobile-topbar {
  display: none;
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 56px;
  background: var(--navy);
  color: var(--white);
  z-index: 100;
  align-items: center;
  padding: 0 1rem;
  gap: 0.75rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
}

.topbar-logo {
  display: flex; align-items: center; gap: 0.5rem; flex: 1;
}
.topbar-logo-icon { font-size: 1.3rem; color: var(--amber); }
.topbar-logo-text { font-family: var(--heading); font-size: 1.05rem; font-weight: 800; }
.topbar-right { margin-left: auto; }

/* Hamburger button */
.burger-btn {
  display: flex; flex-direction: column; justify-content: center;
  gap: 5px; width: 36px; height: 36px;
  background: none; border: none; cursor: pointer; padding: 4px;
  flex-shrink: 0;
}
.burger-line {
  display: block; height: 2px; width: 100%;
  background: var(--white); border-radius: 2px;
  transition: transform 0.25s, opacity 0.25s;
  transform-origin: center;
}
.burger-line:nth-child(1).open { transform: translateY(7px) rotate(45deg); }
.burger-line:nth-child(2).open { opacity: 0; transform: scaleX(0); }
.burger-line:nth-child(3).open { transform: translateY(-7px) rotate(-45deg); }

/* ── Sidebar backdrop ────────────────────────────────────────── */
.sidebar-backdrop {
  display: none;
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 98;
  opacity: 0; pointer-events: none;
  transition: opacity 0.25s;
}
.sidebar-backdrop.visible {
  opacity: 1; pointer-events: all;
}

/* ── Sidebar ─────────────────────────────────────────────────── */
.sidebar {
  width: 240px;
  min-width: 240px;
  background: var(--navy);
  color: var(--white);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 99;
  overflow-y: auto;
  transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 1.25rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.sidebar-logo-icon { font-size: 1.6rem; color: var(--amber); }
.sidebar-logo-text { font-family: var(--heading); font-size: 1.2rem; font-weight: 800; letter-spacing: 0.3px; flex: 1; }

/* Close button — shown only on mobile */
.sidebar-close-btn {
  display: none;
  background: none; border: none; color: rgba(255,255,255,0.6);
  font-size: 1rem; cursor: pointer; padding: 0.25rem;
  transition: color 0.15s;
}
.sidebar-close-btn:hover { color: var(--white); }

/* ── Nav items ───────────────────────────────────────────────── */
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

/* ── Sidebar footer ──────────────────────────────────────────── */
.sidebar-footer {
  border-top: 1px solid rgba(255,255,255,0.1);
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.language-row { display: flex; justify-content: flex-start; }

.user-info {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.user-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(255,255,255,0.15);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.user-details { display: flex; flex-direction: column; overflow: hidden; }
.user-name {
  font-size: 0.85rem; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.user-role { font-size: 0.75rem; color: rgba(255,255,255,0.6); }

.sign-out-btn {
  display: flex; align-items: center; gap: 0.6rem;
  background: rgba(255,255,255,0.08); border: none;
  color: rgba(255,255,255,0.8);
  padding: 0.55rem 0.85rem; border-radius: 6px;
  cursor: pointer; font-size: 0.875rem;
  transition: background 0.15s, color 0.15s; width: 100%;
}
.sign-out-btn:hover { background: rgba(245,166,35,0.2); color: var(--amber); }

/* ── Main area ───────────────────────────────────────────────── */
.main-area {
  margin-left: 240px;
  flex: 1;
  min-height: 100vh;
  background: var(--bg);
  overflow-y: auto;
}

/* ══════════════════════════════════════════════
   RESPONSIVE — tablet & mobile (≤ 768px)
══════════════════════════════════════════════ */
@media (max-width: 768px) {
  /* Show top bar */
  .mobile-topbar { display: flex; }

  /* Hide desktop language switcher inside sidebar footer */
  .sidebar-footer .language-row { display: none; }

  /* Show close button in sidebar header */
  .sidebar-close-btn { display: block; }

  /* Show backdrop */
  .sidebar-backdrop { display: block; }

  /* Sidebar: slide out off-screen by default */
  .sidebar {
    transform: translateX(-100%);
    top: 0;
  }
  .sidebar.sidebar-open {
    transform: translateX(0);
  }

  /* Main area: no left margin, add top padding for topbar */
  .main-area {
    margin-left: 0;
    padding-top: 56px;
  }
}
</style>
