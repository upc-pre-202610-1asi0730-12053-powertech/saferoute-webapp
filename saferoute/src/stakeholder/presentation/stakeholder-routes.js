const profileList            = () => import('./views/profile-list.vue');
const profileForm            = () => import('./views/profile-form.vue');
const communityManagement    = () => import('./views/stakeholder-management.vue');

export const stakeholderRoutes = [
   { path: 'profiles',          name: 'stakeholder-profiles',     component: profileList,         meta: { title: 'Profiles' } },
   { path: 'profiles/new',      name: 'stakeholder-profile-new',  component: profileForm,         meta: { title: 'New Profile' } },
   { path: 'profiles/:id/edit', name: 'stakeholder-profile-edit', component: profileForm,         meta: { title: 'Edit Profile' } },
   { path: 'management',        name: 'stakeholder-management',   component: communityManagement, meta: { title: 'Community Management' } },
];
