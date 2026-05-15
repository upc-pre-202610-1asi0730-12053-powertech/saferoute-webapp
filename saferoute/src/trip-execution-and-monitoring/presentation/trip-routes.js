const tripList         = () => import('./views/trip-list.vue');
const tripForm         = () => import('./views/trip-form.vue');
const tripMonitor      = () => import('./views/trip-monitoring.vue');
const activeTrip       = () => import('./views/active-trip.vue');
const parentTracking   = () => import('./views/parent-tracking.vue');
const attendanceHistory = () => import('./views/attendance-history.vue');

export const tripRoutes = [
   { path: 'trips',          name: 'trip-trips',         component: tripList,          meta: { title: 'Trips' } },
   { path: 'trips/new',      name: 'trip-trip-new',      component: tripForm,          meta: { title: 'New Trip' } },
   { path: 'trips/:id/edit', name: 'trip-trip-edit',     component: tripForm,          meta: { title: 'Edit Trip' } },
   { path: 'monitor',        name: 'trip-monitor',       component: tripMonitor,       meta: { title: 'Trip Monitor' } },
   { path: 'active',         name: 'trip-active',        component: activeTrip,        meta: { title: 'Active Trip' } },
   { path: 'tracking',       name: 'trip-tracking',      component: parentTracking,    meta: { title: 'Trip Tracking' } },
   { path: 'attendance',     name: 'trip-attendance',    component: attendanceHistory, meta: { title: 'Attendance History' } },
];
