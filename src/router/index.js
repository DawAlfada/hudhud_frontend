import { createRouter, createWebHistory } from 'vue-router'
import { getToken, getStoredAuth, clearStoredAuth } from '../api/http'

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
    { path: '/chats', name: 'chats', component: ChatsView },
    { path: '/group-chats', name: 'group-chats', component: GroupChatsView },
    { path: '/chats/:chatId/messages', name: 'chat-messages', component: ChatMessagesView, props: true },
    { path: '/agent', name: 'agent', component: AgentChatView },
  ],
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  if (!getToken()) return { name: 'login', query: { redirect: to.fullPath } }
  const role = getStoredAuth()?.user?.role
  if (role !== 'ADMIN') {
    clearStoredAuth()
    return { name: 'login', query: { reason: 'admin' } }
  }
  return true
})

export default router
