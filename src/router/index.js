import { createRouter, createWebHistory } from 'vue-router'
import { getToken, getStoredAuth, clearStoredAuth } from '../api/http'
import { canAccessConsole, isFullAdmin } from '../utils/roles'

import LoginView from '../views/LoginView.vue'
import UsersView from '../views/UsersView.vue'
import ChatsView from '../views/ChatsView.vue'
import GroupChatsView from '../views/GroupChatsView.vue'
import ChatMessagesView from '../views/ChatMessagesView.vue'
import AgentChatView from '../views/AgentChatView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
    { path: '/', redirect: '/users' },
    { path: '/users', name: 'users', component: UsersView },
    { path: '/chats', name: 'chats', component: ChatsView, meta: { requiresAdmin: true } },
    { path: '/group-chats', name: 'group-chats', component: GroupChatsView, meta: { requiresAdmin: true } },
    {
      path: '/chats/:chatId/messages',
      name: 'chat-messages',
      component: ChatMessagesView,
      props: true,
      meta: { requiresAdmin: true },
    },
    { path: '/agent', name: 'agent', component: AgentChatView, meta: { requiresAdmin: true } },
  ],
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  if (!getToken()) return { name: 'login', query: { redirect: to.fullPath } }
  const role = getStoredAuth()?.user?.role
  if (!canAccessConsole(role)) {
    clearStoredAuth()
    return { name: 'login', query: { reason: 'console' } }
  }
  if (to.meta.requiresAdmin && !isFullAdmin(role)) {
    return { name: 'users', query: { reason: 'admin-only' } }
  }
  return true
})

export default router
