const messageList = () => import('./views/message-list.vue');
const messageForm = () => import('./views/message-form.vue');

export const notificationRoutes = [
   { path: 'alerts',          name: 'notification-alerts',      component: messageList, meta: {title: 'Alerts'}},
   { path: 'alerts/new',      name: 'notification-alert-new',   component: messageForm, meta: {title: 'New Alert'}},
   { path: 'alerts/:id/edit', name: 'notification-alert-edit',  component: messageForm, meta: {title: 'Edit Alert'}}
];
