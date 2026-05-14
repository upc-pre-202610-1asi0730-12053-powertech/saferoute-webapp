import {createRouter, createWebHistory} from "vue-router";
import Home from "./shared/presentation/views/home.vue";
import {iamRoutes} from "./iam/presentation/iam-routes.js";
import {stakeholderRoutes} from "./stakeholder/presentation/stakeholder-routes.js";
import {routeRoutes} from "./fleet-and-route-planning/presentation/route-routes.js";
import {tripRoutes} from "./trip/presentation/trip-routes.js";
import {subscriptionRoutes} from "./subscription/presentation/subscription-routes.js";
import {notificationRoutes} from "./notification/presentation/notification-routes.js";

const about = () => import('./shared/presentation/views/about.vue');
const pageNotFound = () => import('./shared/presentation/views/page-not-found.vue');

const routes = [
   { path: '/home',            name: 'home',       component: Home,        meta: { title: 'Home' } },
   { path: '/about',           name: 'about',      component: about,       meta: { title: 'About' } },
   { path: '/iam',             children: iamRoutes },
   { path: '/stakeholder',     children: stakeholderRoutes },
   { path: '/fleet-and-route-planning',           children: routeRoutes },
   { path: '/trip',            children: tripRoutes },
   { path: '/subscription',    children: subscriptionRoutes },
   { path: '/notification',    children: notificationRoutes },
   { path: '/',                redirect: '/home' },
   { path: '/:pathMatch(.*)*', name: 'not-found', component: pageNotFound, meta: { title: 'Page Not Found' } }
];

const router = createRouter({
   history: createWebHistory(import.meta.env.BASE_URL),
   routes: routes,
});

router.beforeEach((to, from, next) => {
   let baseTitle = 'SafeRoute';
   document.title = `${baseTitle} | ${to.meta['title'] || 'Default'}`;
   return next();
});

export default router;
