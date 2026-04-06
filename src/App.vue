<script setup>
import { computed } from 'vue'
import { useRoute, useRouter, RouterLink, RouterView } from 'vue-router'
import { getToken, authTick, getStoredAuth, clearStoredAuth } from './api/http'
import AppAlertDialog from './components/AppAlertDialog.vue'
import AppConfirmDialog from './components/AppConfirmDialog.vue'
import UserAvatar from './components/UserAvatar.vue'

const route = useRoute()
const router = useRouter()

const navLink =
  'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium no-underline transition-all duration-200 text-zinc-600 hover:bg-white/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100'

const navActive =
  'bg-white shadow-sm shadow-zinc-900/5 ring-1 ring-primary/25 text-zinc-900 dark:bg-primary/10 dark:shadow-none dark:ring-primary/35 dark:text-white'

const authed = computed(() => {
  authTick.value
  return !!getToken() && route.name !== 'login'
})

const profile = computed(() => {
  authTick.value
  const auth = getStoredAuth()
  return auth?.user ?? null
})

function logout() {
  clearStoredAuth()
  router.push({ name: 'login', query: { logout: '1' } })
}
</script>

<template>
  <div
    :class="[
      'min-h-screen',
      authed && 'flex min-h-screen flex-col bg-zinc-100 md:flex-row dark:bg-[#0a0a0c]',
    ]"
  >
    <template v-if="authed">
      <aside
        class="flex w-full shrink-0 flex-col border-b border-white/40 bg-white/55 shadow-sm backdrop-blur-2xl dark:border-white/[0.06] dark:bg-zinc-900/45 md:w-[268px] md:min-h-screen md:border-b-0 md:border-r md:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.08)] dark:md:shadow-none"
        aria-label="Main navigation"
      >
        <div class="border-b border-zinc-200/60 px-5 pb-5 pt-6 dark:border-white/[0.06]">
          <RouterLink to="/users" class="flex items-center gap-3 no-underline">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white shadow-md shadow-primary/30"
            >
              H
            </span>
            <div>
              <span class="block text-base font-bold tracking-tight text-zinc-900 dark:text-white">HudHud</span>
              <span class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                Admin
              </span>
            </div>
          </RouterLink>
        </div>

        <nav class="flex flex-1 flex-row flex-wrap gap-1.5 p-3 md:flex-col md:flex-nowrap md:px-3 md:py-4">
          <RouterLink to="/users" :class="navLink" :active-class="navActive">
            <Icon icon="heroicons:users" class="h-[1.125rem] w-[1.125rem] shrink-0 opacity-80" aria-hidden="true" />
            <span class="whitespace-nowrap">Users</span>
          </RouterLink>
          <RouterLink to="/chats" :class="navLink" :active-class="navActive">
            <Icon icon="heroicons:chat-bubble-left-right" class="h-[1.125rem] w-[1.125rem] shrink-0 opacity-80" aria-hidden="true" />
            <span class="whitespace-nowrap">P2P chats</span>
          </RouterLink>
          <RouterLink to="/group-chats" :class="navLink" :active-class="navActive">
            <Icon icon="heroicons:user-group" class="h-[1.125rem] w-[1.125rem] shrink-0 opacity-80" aria-hidden="true" />
            <span class="whitespace-nowrap">Group chats</span>
          </RouterLink>
          <RouterLink to="/agent" :class="navLink" :active-class="navActive">
            <Icon icon="heroicons:chat-bubble-oval-left-ellipsis" class="h-[1.125rem] w-[1.125rem] shrink-0 opacity-80" aria-hidden="true" />
            <span class="whitespace-nowrap">Agent</span>
          </RouterLink>
        </nav>

        <div class="mt-auto flex flex-col gap-3 border-t border-zinc-200/60 p-4 dark:border-white/[0.06] md:flex-col">
          <div
            class="flex min-w-0 items-center gap-3 rounded-2xl border border-zinc-200/60 bg-white/50 p-3 dark:border-white/[0.06] dark:bg-white/[0.03]"
          >
            <UserAvatar :user="profile" :name="profile?.name" size="md" rounded="xl" />
            <div class="flex min-w-0 flex-col gap-0.5">
              <span class="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                {{ profile?.name || 'Signed in' }}
              </span>
              <span class="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {{ profile?.phoneNumber || '—' }}
              </span>
              <span
                v-if="profile?.role"
                class="text-[0.65rem] font-bold uppercase tracking-wider text-primary"
              >
                {{ profile.role }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/40 text-sm font-medium text-zinc-600 backdrop-blur-sm transition hover:border-zinc-300 hover:bg-white/80 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-transparent dark:text-zinc-400 dark:hover:border-white/15 dark:hover:bg-white/[0.06] dark:hover:text-white md:w-full"
            title="Log out"
            aria-label="Log out"
            @click="logout"
          >
            <Icon icon="heroicons:arrow-left-start-on-rectangle" class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <main class="mx-auto box-border w-full max-w-7xl flex-1 px-4 py-6 pb-10 sm:px-6 md:px-8 md:py-8">
          <RouterView />
        </main>
      </div>
    </template>

    <template v-else>
      <RouterView />
    </template>

    <AppAlertDialog />
    <AppConfirmDialog />
  </div>
</template>
