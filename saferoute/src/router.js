import { createRouter, createWebHistory } from "vue-router";
import Home from "./shared/presentation/views/home.vue";
import { iamRoutes } from "./identity-and-access-management/presentation/iam-routes.js";
import { stakeholderRoutes } from "./stakeholder-and-asset-management/presentation/stakeholder-routes.js";
import { routeRoutes } from "./fleet-and-route-planning/presentation/route-routes.js";
import { tripRoutes } from "./trip-execution-and-monitoring/presentation/trip-routes.js";
import { subscriptionRoutes } from "./subscription-and-plan-management/presentation/subscription-routes.js";
import { notificationRoutes } from "./notifications-and-communication/presentation/notification-routes.js";

const about        = () => import('./shared/presentation/views/about.vue');
const pageNotFound = () => import('./shared/presentation/views/page-not-found.vue');

const routes = [
   { path: '/home',            name: 'home',       component: Home,        meta: { title: 'Home', requiresAuth: true } },
   { path: '/about',           name: 'about',      component: about,       meta: { title: 'About' } },
   { path: '/identity-and-access-management',             children: iamRoutes },
   { path: '/stakeholder-and-asset-management',     children: stakeholderRoutes,                meta: { requiresAuth: true } },
   { path: '/fleet-and-route-planning',           children: routeRoutes,                      meta: { requiresAuth: true } },
   { path: '/trip-execution-and-monitoring',            children: tripRoutes,                       meta: { requiresAuth: true } },
   { path: '/subscription-and-plan-management',    children: subscriptionRoutes },
   { path: '/notifications-and-communication',    children: notificationRoutes,               meta: { requiresAuth: true } },
   { path: '/',                redirect: '/home' },
   { path: '/:pathMatch(.*)*', name: 'not-found',  component: pageNotFound, meta: { title: 'Page Not Found' } }
];

const router = createRouter({
   history: createWebHistory(import.meta.env.BASE_URL),
   routes: routes,
});

router.beforeEach((to, from, next) => {
   const baseTitle = 'SafeRoute';
   document.title = `${baseTitle} | ${to.meta['title'] || 'Default'}`;


   const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
   const token = localStorage.getItem('saferoute.token');

   if (requiresAuth && !token) {
      return next({ name: 'iam-sign-in', query: { redirect: to.fullPath } });
   }

   // If already authenticated and trying to visit sign-in/sign-up, send home.
   // Landing handles its own redirect in onMounted, so we leave it alone.
   if (token && (to.name === 'iam-sign-in' || to.name === 'iam-sign-up')) {
      return next({ name: 'home' });
   }

   return next();
});

export default router;
