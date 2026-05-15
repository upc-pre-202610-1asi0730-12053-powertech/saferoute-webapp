const tripList = () => import('./views/trip-list.vue');
const tripForm = () => import('./views/trip-form.vue');

export const tripRoutes = [
   { path: 'trips',          name: 'trip-trips',      component: tripList, meta: {title: 'Trips'}},
   { path: 'trips/new',      name: 'trip-trip-new',   component: tripForm, meta: {title: 'New Trip'}},
   { path: 'trips/:id/edit', name: 'trip-trip-edit',  component: tripForm, meta: {title: 'Edit Trip'}}
];
