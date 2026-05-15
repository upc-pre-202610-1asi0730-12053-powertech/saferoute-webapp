const planList = () => import('./views/plan-list.vue');
const planForm = () => import('./views/plan-form.vue');

export const subscriptionRoutes = [
   { path: 'plans',          name: 'subscription-plans',      component: planList, meta: {title: 'Plans'}},
   { path: 'plans/new',      name: 'subscription-plan-new',   component: planForm, meta: {title: 'New Plan'}},
   { path: 'plans/:id/edit', name: 'subscription-plan-edit',  component: planForm, meta: {title: 'Edit Plan'}}
];
