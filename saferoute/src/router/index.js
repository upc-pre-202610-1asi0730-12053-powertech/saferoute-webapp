import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../public/presentation/views/home.vue'
import AboutView from '../public/presentation/views/about.vue'
import PageNotFoundView from '../public/presentation/views/page-not-found.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: PageNotFoundView
    }
  ]
})

export default router
