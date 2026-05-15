const alertCenter = () => import('./views/alert-center.vue');
const messageForm = () => import('./views/message-form.vue');

export const notificationRoutes = [
   { path: 'alerts',          name: 'notifications-and-communication-alerts',      component: alertCenter, meta: { title: 'Alerts',     requiresAuth: true } },
   { path: 'alerts/new',      name: 'notifications-and-communication-alert-new',   component: messageForm, meta: { title: 'New Alert',  requiresAuth: true } },
   { path: 'alerts/:id/edit', name: 'notifications-and-communication-alert-edit',  component: messageForm, meta: { title: 'Edit Alert', requiresAuth: true } },
];
