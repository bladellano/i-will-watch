import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/pages/HomePage.vue'), meta: { requiresAuth: true } },
    { path: '/adicionar', name: 'add-media', component: () => import('@/pages/AddMediaPage.vue'), meta: { requiresAuth: true } },
    { path: '/listas/:listaId', name: 'list', component: () => import('@/pages/ListPage.vue'), meta: { requiresAuth: true } },
    {
      path: '/listas/:listaId/obras/:vinculoId',
      name: 'list-item',
      component: () => import('@/pages/MediaDetailPage.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/perfil', name: 'profile', component: () => import('@/pages/ProfilePage.vue'), meta: { requiresAuth: true } },
    { path: '/capturar', name: 'capture-new', component: () => import('@/pages/CapturePage.vue'), meta: { requiresAuth: true } },
    { path: '/capturas/:id', name: 'capture', component: () => import('@/pages/CaptureDetailPage.vue'), meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: () => import('@/pages/LoginPage.vue'), meta: { guestOnly: true } },
    { path: '/cadastro', name: 'register', component: () => import('@/pages/RegisterPage.vue'), meta: { guestOnly: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'home' }
  }
})

const titles: Record<string, string> = {
  home: 'Suas listas',
  'add-media': 'Adicionar filme ou série',
  list: 'Lista',
  'list-item': 'Detalhes da obra',
  'capture-new': 'Nova captura',
  capture: 'Captura',
  profile: 'Meu perfil',
  login: 'Entrar',
  register: 'Criar conta',
}

router.afterEach((to) => {
  const page = titles[String(to.name)]
  document.title = page ? `${page} · Minha lista de filmes e séries` : 'Minha lista de filmes e séries'
})

export default router
