// Lazy-loaded views
const planSelection      = () => import('./views/plan-selection.vue');
const subscriptionStatus = () => import('./views/subscription-status.vue');
const checkout           = () => import('./views/checkout.vue');

/**
 * Routes for the Subscription bounded context.
 * Mounted under `/subscription-and-plan-management` from the root router (see `src/router.js`).
 */
export const subscriptionRoutes = [
    { path: 'plans',    name: 'subscription-and-plan-management-plans',    component: planSelection,      meta: { title: 'Plans',        requiresAuth: true  } },
    { path: 'status',   name: 'subscription-and-plan-management-status',   component: subscriptionStatus, meta: { title: 'Subscription', requiresAuth: true  } },
    { path: 'checkout', name: 'subscription-and-plan-management-checkout', component: checkout,           meta: { title: 'Checkout',     hideNav: true        } },
];
