<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '../api/users'
import { setStoredAuth } from '../api/http'
import { canAccessConsole } from '../utils/roles'
import { alertError } from '../utils/alerts'
import { validatePhone, validatePassword } from '../utils/validation'
import PasswordField from '../components/PasswordField.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const router = useRouter()
const route = useRoute()
const phoneNumber = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const fieldErrors = ref({ phone: '', password: '' })

const inputBase =
  'block w-full rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-3 text-zinc-900 shadow-sm outline-none backdrop-blur-sm transition focus:border-primary focus:ring-2 focus:ring-primary/25 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:border-primary'

const phoneInputClass = computed(() => [
  inputBase,
  'mt-2',
  fieldErrors.value.phone ? 'border-red-500/70 ring-1 ring-red-500/25 dark:border-red-400/55' : '',
])

function clearFieldErrors() {
  fieldErrors.value = { phone: '', password: '' }
}

onMounted(() => {
  if (route.query.logout) error.value = ''
  if (route.query.reason === 'console' || route.query.reason === 'admin') {
    const msg = 'Sign-in requires an administrator or support account.'
    error.value = msg
    alertError(msg)
  }
})

async function submit() {
  error.value = ''
  clearFieldErrors()

  const ep = validatePhone(phoneNumber.value)
  const ew = validatePassword(password.value, { label: 'Password' })
  fieldErrors.value = { phone: ep, password: ew }
  if (ep || ew) return

  loading.value = true
  try {
    const data = await login({ phoneNumber: phoneNumber.value.trim(), password: password.value })
    const user = data.result
    if (!user?.token) throw new Error('No token returned')
    if (!canAccessConsole(user.role)) {
      const msg = 'Sign-in requires an administrator or support account.'
      error.value = msg
      alertError(msg)
      return
    }
    setStoredAuth(user, user.token)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/users'
    router.replace(redirect)
  } catch (e) {
    error.value = e.message || 'Login failed'
    alertError(e, error.value)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-zinc-100 p-6 dark:bg-[#0a0a0c]">
    <form
      class="w-full max-w-sm rounded-3xl border border-white/60 bg-white/70 p-8 shadow-2xl shadow-zinc-900/10 ring-1 ring-zinc-900/[0.04] backdrop-blur-xl dark:border-white/[0.06] dark:bg-zinc-900/50 dark:shadow-none dark:ring-white/[0.06]"
      @submit.prevent="submit"
    >
      <div class="mb-6 flex items-center gap-3">
        <span
          class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white shadow-md shadow-primary/30"
        >
          H
        </span>
        <div>
          <h1 class="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">HudHud Admin</h1>
          <p class="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Sign in</p>
        </div>
      </div>
      <p class="mb-6 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        Administrator and support accounts only. Regular app users cannot open this console.
      </p>
      <label class="mb-4 block text-sm font-semibold text-zinc-800 dark:text-zinc-200" for="login-phone">
        Phone number
        <input
          id="login-phone"
          v-model="phoneNumber"
          type="tel"
          autocomplete="username"
          inputmode="tel"
          :class="phoneInputClass"
          @input="fieldErrors.phone = ''"
        />
        <p v-if="fieldErrors.phone" class="mt-1.5 text-[0.8125rem] font-medium text-red-600 dark:text-red-400">
          {{ fieldErrors.phone }}
        </p>
      </label>
      <div class="mb-4">
        <span class="mb-0 block text-sm font-semibold text-zinc-800 dark:text-zinc-200">Password</span>
        <div class="mt-2">
          <PasswordField
            v-model="password"
            :input-class="inputBase"
            :error="fieldErrors.password"
            autocomplete="current-password"
            @update:model-value="fieldErrors.password = ''"
          />
        </div>
      </div>
      <p v-if="error" class="mb-3 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <button
        type="submit"
        class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-md shadow-primary/25 transition hover:bg-secondary hover:shadow-secondary/25 disabled:opacity-50"
        :disabled="loading"
      >
        <LoadingSpinner v-if="loading" size="sm" tone="on-primary" :announce="false" />
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>
