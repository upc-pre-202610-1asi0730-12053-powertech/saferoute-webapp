const userList = () => import('./views/user-list.vue');
const userForm = () => import('./views/user-form.vue');

export const iamRoutes = [
   { path: 'users',          name: 'iam-users',      component: userList, meta: {title: 'Users'}},
   { path: 'users/new',      name: 'iam-user-new',   component: userForm, meta: {title: 'New User'}},
   { path: 'users/:id/edit', name: 'iam-user-edit',  component: userForm, meta: {title: 'Edit User'}}
];
