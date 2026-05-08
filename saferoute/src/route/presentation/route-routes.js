const routeList = () => import('./views/route-list.vue');
const routeForm = () => import('./views/route-form.vue');

export const routeRoutes = [
   { path: 'routes',          name: 'route-routes',      component: routeList, meta: {title: 'Routes'}},
   { path: 'routes/new',      name: 'route-route-new',   component: routeForm, meta: {title: 'New Route'}},
   { path: 'routes/:id/edit', name: 'route-route-edit',  component: routeForm, meta: {title: 'Edit Route'}}
];
