const signIn             = () => import('./views/sign-in.vue');
const signUp             = () => import('./views/sign-up.vue');
const organizationManage = () => import('./views/organization-management.vue');
const adminProfile       = () => import('./views/admin-profile.vue');

export const iamRoutes = [
   { path: 'sign-in',      name: 'iam-sign-in',      component: signIn,             meta: { title: 'Sign In',     hideNav: true } },
   { path: 'sign-up',      name: 'iam-sign-up',      component: signUp,             meta: { title: 'Sign Up',     hideNav: true } },
   { path: 'organization', name: 'iam-organization', component: organizationManage, meta: { title: 'Organization', requiresAuth: true } },
   { path: 'profile',      name: 'iam-profile',      component: adminProfile,       meta: { title: 'My Profile',  requiresAuth: true } },
];
