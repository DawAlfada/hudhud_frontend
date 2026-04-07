<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStoredAuth, authTick } from '../api/http'
import { isFullAdmin } from '../utils/roles'
import {
  fetchUsers,
  updateUser,
  updateUserPhone,
  deleteUser,
  sendOtp,
  register,
  forgotPassword,
} from '../api/users'
import { alertError, alertInfo, alertSuccess } from '../utils/alerts'
import { confirmDialog } from '../utils/appConfirm'
import { validateName, validatePassword, validateOtp } from '../utils/validation'
import PasswordField from '../components/PasswordField.vue'
import DataTableSkeleton from '../components/DataTableSkeleton.vue'
import UserAvatar from '../components/UserAvatar.vue'

const route = useRoute()
const router = useRouter()

const isAdmin = computed(() => {
  authTick.value
  return isFullAdmin(getStoredAuth()?.user?.role)
})

const dialogBackdrop =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-5 backdrop-blur-sm'

const dialogPanel =
  'w-full max-w-[420px] max-h-[min(90vh,640px)] overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#2c3038] p-6 shadow-2xl ring-1 ring-inset ring-white/[0.04]'

const fieldLabel = 'text-[0.8125rem] font-medium text-gray-200'

const fieldInput =
  'w-full rounded-xl border border-white/10 bg-[#1a1d23] px-3.5 py-2.5 text-[0.9375rem] text-gray-50 placeholder:text-gray-500 outline-none transition hover:border-white/[0.12] focus:border-[rgb(139,154,204,0.55)] focus:ring-2 focus:ring-[rgb(139,154,204,0.2)]'

const fieldInputReadonly =
  'cursor-default bg-[#22262e] opacity-85 border-white/10'

const btnOutline =
  'rounded-[10px] border border-white/25 bg-[#363a44] px-4 py-2 text-sm font-medium text-gray-100 transition hover:bg-[#3d424d] hover:border-white/[0.28] disabled:cursor-not-allowed disabled:opacity-45'

const btnPrimary =
  'rounded-[10px] border border-transparent bg-[#9ca8dc] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#aab4e3] active:bg-[#8f9bd2] disabled:cursor-not-allowed disabled:opacity-45'

const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(15)
const nameFilter = ref('')
const loading = ref(false)
const err = ref('')

const editOpen = ref(false)
const editUser = ref(null)
const editForm = ref({ name: '', phoneNumber: '', password: '' })

const registerOpen = ref(false)
const regForm = ref({ fullName: '', phoneNumber: '', password: '', otpCode: '' })
const regBusy = ref(false)
const regOtpCooldown = ref(0)
const regOtpCooldownUntil = ref(0)

const resetOpen = ref(false)
const resetForm = ref({ phoneNumber: '', otpCode: '', newPassword: '' })
const resetBusy = ref(false)
const resetOtpCooldown = ref(0)
const resetOtpCooldownUntil = ref(0)

const phoneOpen = ref(false)
const phoneBusy = ref(false)
const phoneTargetUser = ref(null)
const phoneForm = ref({ phoneNumber: IRAQ_CC, otpCode: '' })
const phoneErrors = ref({ phone: '', otpCode: '' })
const phoneOtpCooldown = ref(0)
const phoneOtpCooldownUntil = ref(0)

const editErrors = ref({ name: '', phone: '', password: '' })
const regErrors = ref({ fullName: '', phone: '', password: '', otpCode: '' })
const resetErrors = ref({ otpCode: '', newPassword: '' })

const fieldInvalid = (msg) =>
  msg ? 'border-red-400/65 ring-1 ring-red-400/25 focus:border-red-400/50' : ''
const OTP_COOLDOWN_SECONDS = 30
const IRAQ_CC = '964'

let otpCooldownTimer = null

const canSendRegOtp = computed(() => !regBusy.value && regOtpCooldown.value === 0)
const canSendResetOtp = computed(() => !resetBusy.value && resetOtpCooldown.value === 0)
const canSendPhoneOtp = computed(() => !phoneBusy.value && phoneOtpCooldown.value === 0)

function updateOtpCooldowns() {
  const now = Date.now()
  regOtpCooldown.value = Math.max(0, Math.ceil((regOtpCooldownUntil.value - now) / 1000))
  resetOtpCooldown.value = Math.max(0, Math.ceil((resetOtpCooldownUntil.value - now) / 1000))
  phoneOtpCooldown.value = Math.max(0, Math.ceil((phoneOtpCooldownUntil.value - now) / 1000))
  if (regOtpCooldown.value === 0) regOtpCooldownUntil.value = 0
  if (resetOtpCooldown.value === 0) resetOtpCooldownUntil.value = 0
  if (phoneOtpCooldown.value === 0) phoneOtpCooldownUntil.value = 0
  if (regOtpCooldown.value === 0 && resetOtpCooldown.value === 0 && phoneOtpCooldown.value === 0 && otpCooldownTimer) {
    clearInterval(otpCooldownTimer)
    otpCooldownTimer = null
  }
}

function startOtpCooldown(kind) {
  const until = Date.now() + OTP_COOLDOWN_SECONDS * 1000
  if (kind === 'register') regOtpCooldownUntil.value = until
  else if (kind === 'reset') resetOtpCooldownUntil.value = until
  else phoneOtpCooldownUntil.value = until
  updateOtpCooldowns()
  if (!otpCooldownTimer) otpCooldownTimer = setInterval(updateOtpCooldowns, 1000)
}

function totalPages() {
  return Math.max(1, Math.ceil(total.value / pageSize.value))
}

function normalizeIraqiPhone(v) {
  const digits = String(v || '').replace(/\D/g, '')
  if (!digits) return ''
  let local = digits
  if (digits.startsWith('00' + IRAQ_CC)) local = digits.slice(5)
  else if (digits.startsWith(IRAQ_CC)) local = digits.slice(3)
  else if (digits.startsWith('0')) local = digits.slice(1)
  return `${IRAQ_CC}${local}`.slice(0, 13)
}

function validateIraqiPhone(v) {
  const normalized = normalizeIraqiPhone(v)
  if (!normalized) return 'Phone number is required'
  if (!normalized.startsWith('9647')) return 'Phone must start with 7 after 964'
  if (normalized.length !== 13) return 'Phone must be in format 9647XXXXXXXXX'
  return ''
}

function onRegPhoneInput() {
  regForm.value.phoneNumber = normalizeIraqiPhone(regForm.value.phoneNumber)
  regErrors.value.phone = ''
}

function onEditPhoneInput() {
  editForm.value.phoneNumber = normalizeIraqiPhone(editForm.value.phoneNumber)
  editErrors.value.phone = ''
}

function onPhoneUpdateInput() {
  phoneForm.value.phoneNumber = normalizeIraqiPhone(phoneForm.value.phoneNumber)
  phoneErrors.value.phone = ''
}

async function load() {
  err.value = ''
  loading.value = true
  try {
    const data = await fetchUsers({
      page: page.value,
      pageSize: pageSize.value,
      name: nameFilter.value || undefined,
    })
    rows.value = data.result ?? []
    total.value = data.total ?? 0
  } catch (e) {
    err.value = e.message
    alertError(e)
    rows.value = []
  } finally {
    loading.value = false
  }
}

function openEdit(u) {
  if (!isAdmin.value) return
  editUser.value = u
  editForm.value = { name: u.name, phoneNumber: normalizeIraqiPhone(u.phoneNumber), password: '' }
  editErrors.value = { name: '', phone: '', password: '' }
  editOpen.value = true
}

async function saveEdit() {
  if (!isAdmin.value || !editUser.value) return
  err.value = ''
  const nameE = validateName(editForm.value.name, 'Name')
  const passE = validatePassword(editForm.value.password, { optional: true, label: 'New password' })
  editErrors.value = { name: nameE, phone: '', password: passE }
  if (nameE || passE) return
  try {
    const body = {
      name: editForm.value.name || null,
      password: editForm.value.password || null,
    }
    await updateUser(editUser.value.id, body)
    editOpen.value = false
    await load()
  } catch (e) {
    err.value = e.message
    alertError(e)
  }
}

async function confirmDelete(u) {
  const ok = await confirmDialog({
    title: 'Delete user',
    message: `Delete user ${u.name} (${u.phoneNumber})?`,
    confirmLabel: 'Delete',
    variant: 'danger',
  })
  if (!ok) return
  err.value = ''
  try {
    await deleteUser(u.id)
    await load()
  } catch (e) {
    err.value = e.message
    alertError(e)
  }
}

function openRegister() {
  regForm.value = { fullName: '', phoneNumber: IRAQ_CC, password: '', otpCode: '' }
  regErrors.value = { fullName: '', phone: '', password: '', otpCode: '' }
  regOtpCooldown.value = 0
  regOtpCooldownUntil.value = 0
  registerOpen.value = true
}

async function sendRegOtp() {
  if (!canSendRegOtp.value) return
  err.value = ''
  const phoneE = validateIraqiPhone(regForm.value.phoneNumber)
  regErrors.value = { ...regErrors.value, phone: phoneE }
  if (phoneE) return
  regBusy.value = true
  try {
    await sendOtp(normalizeIraqiPhone(regForm.value.phoneNumber))
    startOtpCooldown('register')
    alertInfo('OTP sent (check SMS / dev logs).')
  } catch (e) {
    err.value = e.message
    alertError(e)
  } finally {
    regBusy.value = false
  }
}

async function submitRegister() {
  err.value = ''
  regErrors.value = {
    fullName: validateName(regForm.value.fullName, 'Full name'),
    phone: validateIraqiPhone(regForm.value.phoneNumber),
    password: validatePassword(regForm.value.password),
    otpCode: validateOtp(regForm.value.otpCode),
  }
  if (Object.values(regErrors.value).some(Boolean)) return
  regBusy.value = true
  try {
    await register({ ...regForm.value, phoneNumber: normalizeIraqiPhone(regForm.value.phoneNumber) })
    registerOpen.value = false
    await load()
    alertSuccess('User registered.')
  } catch (e) {
    err.value = e.message
    alertError(e)
  } finally {
    regBusy.value = false
  }
}

function openReset(u) {
  resetForm.value = { phoneNumber: normalizeIraqiPhone(u.phoneNumber), otpCode: '', newPassword: '' }
  resetErrors.value = { otpCode: '', newPassword: '' }
  resetOtpCooldown.value = 0
  resetOtpCooldownUntil.value = 0
  resetOpen.value = true
}

async function sendResetOtp() {
  if (!canSendResetOtp.value) return
  resetBusy.value = true
  err.value = ''
  try {
    await sendOtp(normalizeIraqiPhone(resetForm.value.phoneNumber))
    startOtpCooldown('reset')
    alertInfo('OTP sent.')
  } catch (e) {
    err.value = e.message
    alertError(e)
  } finally {
    resetBusy.value = false
  }
}

function openPhoneUpdate(u) {
  phoneTargetUser.value = u
  phoneForm.value = { phoneNumber: normalizeIraqiPhone(u.phoneNumber), otpCode: '' }
  phoneErrors.value = { phone: '', otpCode: '' }
  phoneOtpCooldown.value = 0
  phoneOtpCooldownUntil.value = 0
  phoneOpen.value = true
}

async function sendPhoneOtp() {
  if (!canSendPhoneOtp.value) return
  err.value = ''
  const phoneE = validateIraqiPhone(phoneForm.value.phoneNumber)
  phoneErrors.value = { ...phoneErrors.value, phone: phoneE }
  if (phoneE) return
  phoneBusy.value = true
  try {
    await sendOtp(normalizeIraqiPhone(phoneForm.value.phoneNumber))
    startOtpCooldown('phone')
    alertInfo('OTP sent.')
  } catch (e) {
    err.value = e.message
    alertError(e)
  } finally {
    phoneBusy.value = false
  }
}

async function submitPhoneUpdate() {
  if (!phoneTargetUser.value?.id) return
  err.value = ''
  phoneErrors.value = {
    phone: validateIraqiPhone(phoneForm.value.phoneNumber),
    otpCode: validateOtp(phoneForm.value.otpCode),
  }
  if (Object.values(phoneErrors.value).some(Boolean)) return
  phoneBusy.value = true
  try {
    await updateUserPhone(phoneTargetUser.value.id, {
      phoneNumber: normalizeIraqiPhone(phoneForm.value.phoneNumber),
      otpCode: String(phoneForm.value.otpCode || '').trim(),
    })
    phoneOpen.value = false
    await load()
    alertSuccess('Phone number updated.')
  } catch (e) {
    err.value = e.message
    alertError(e)
  } finally {
    phoneBusy.value = false
  }
}

async function submitReset() {
  err.value = ''
  resetErrors.value = {
    otpCode: validateOtp(resetForm.value.otpCode),
    newPassword: validatePassword(resetForm.value.newPassword, { label: 'New password' }),
  }
  if (Object.values(resetErrors.value).some(Boolean)) return
  resetBusy.value = true
  try {
    await forgotPassword({ ...resetForm.value })
    resetOpen.value = false
    alertSuccess('Password updated.')
  } catch (e) {
    err.value = e.message
    alertError(e)
  } finally {
    resetBusy.value = false
  }
}

function applySearch() {
  page.value = 1
  load()
}

const toolbarInput =
  'min-w-[10rem] flex-1 rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-2.5 text-sm text-zinc-900 shadow-sm outline-none backdrop-blur-sm placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/25 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-primary'

const iconBtnEdit =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 shadow-sm transition hover:scale-[1.03] hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-[0.97] dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:border-primary/45 dark:hover:bg-primary/15 dark:hover:text-primary'

const iconBtnKey =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 shadow-sm transition hover:scale-[1.03] hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 active:scale-[0.97] dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:border-amber-500/35 dark:hover:bg-amber-500/10 dark:hover:text-amber-300'

const iconBtnPhone =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 shadow-sm transition hover:scale-[1.03] hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.97] dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:border-sky-500/35 dark:hover:bg-sky-500/10 dark:hover:text-sky-300'

const iconBtnTrash =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 shadow-sm transition hover:scale-[1.03] hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.97] dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:border-red-500/35 dark:hover:bg-red-500/10 dark:hover:text-red-400'

onMounted(() => {
  if (route.query.reason === 'admin-only') {
    alertInfo('That area is only available to full administrators.')
    router.replace({ name: 'users' })
  }
  load()
})

onUnmounted(() => {
  if (!otpCooldownTimer) return
  clearInterval(otpCooldownTimer)
  otpCooldownTimer = null
})
</script>

<template>
  <div class="w-full" :aria-busy="loading">
    <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="mb-0 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Users</h1>
        <p class="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {{
            isAdmin
              ? 'Manage accounts — register, edit, reset passwords, or remove users.'
              : 'View users and reset passwords — support tools only.'
          }}
        </p>
      </div>
      <button
        v-if="isAdmin"
        type="button"
        class="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition hover:bg-secondary hover:shadow-secondary/25 active:scale-[0.98]"
        @click="openRegister"
      >
        <Icon icon="heroicons:plus" class="h-4 w-4" aria-hidden="true" />
        Add New User
      </button>
    </header>

    <div class="mb-5 flex gap-2">
      <input
        v-model="nameFilter"
        type="search"
        placeholder="Search by name…"
        :class="toolbarInput"
        @keyup.enter="applySearch()"
      />
      <button
        type="button"
        class="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-secondary/25 transition hover:bg-primary active:scale-[0.98]"
        title="Search"
        aria-label="Search users"
        @click="applySearch()"
      >
        <Icon icon="heroicons:magnifying-glass" class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <p
      v-if="err"
      class="mb-4 rounded-lg border border-red-300/50 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:text-red-400"
    >
      {{ err }}
    </p>
    <DataTableSkeleton v-if="loading" label="Loading users…" variant="users" />

    <div
      v-else
      class="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-xl shadow-zinc-900/[0.03] ring-1 ring-zinc-900/[0.04] backdrop-blur-md dark:border-white/[0.06] dark:bg-zinc-900/45 dark:shadow-none dark:ring-white/[0.04]"
    >
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-zinc-200/80 dark:border-white/[0.06]">
              <th scope="col" class="px-5 py-4 text-left text-[0.7rem] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Name
              </th>
              <th scope="col" class="px-5 py-4 text-left text-[0.7rem] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Phone
              </th>
              <th scope="col" class="px-5 py-4 text-left text-[0.7rem] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Role
              </th>
              <th scope="col" class="w-[1%] px-5 py-4 text-right">
                <span class="sr-only">Actions</span>
                <span class="inline-flex justify-end text-zinc-300 dark:text-zinc-600" aria-hidden="true">
                  <Icon icon="heroicons:ellipsis-vertical" class="h-4 w-4" aria-hidden="true" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-white/[0.06]">
            <tr v-if="rows.length === 0">
              <td colspan="4" class="px-5 py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No users on this page.
              </td>
            </tr>
            <tr
              v-for="u in rows"
              :key="u.id"
              class="bg-white/50 transition-colors hover:bg-primary/[0.06] dark:bg-transparent dark:hover:bg-white/[0.03]"
            >
              <td class="px-5 py-4">
                <div class="flex min-w-0 items-center gap-3">
                  <UserAvatar size="sm" :user="u" :name="u.name" />
                  <span class="min-w-0 font-medium text-zinc-900 dark:text-white">{{ u.name }}</span>
                </div>
              </td>
              <td class="px-5 py-4 tabular-nums text-zinc-600 dark:text-zinc-300">
                {{ u.phoneNumber }}
              </td>
              <td class="px-5 py-4">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide ring-1 ring-inset"
                  :class="
                    u.role === 'ADMIN'
                      ? 'bg-primary/15 text-primary ring-primary/25 dark:ring-primary/35'
                      : u.role === 'DATA_ENTRY'
                        ? 'bg-amber-500/12 text-amber-900 ring-amber-500/20 dark:text-amber-200 dark:ring-amber-400/25'
                        : 'bg-zinc-500/10 text-zinc-700 ring-zinc-500/15 dark:text-zinc-300 dark:ring-white/10'
                  "
                >
                  {{ u.role }}
                </span>
              </td>
              <td class="whitespace-nowrap px-5 py-3 text-right">
                <div class="inline-flex items-center justify-end gap-1.5">
                  <button
                    v-if="isAdmin"
                    type="button"
                    :class="iconBtnEdit"
                    title="Edit user"
                    aria-label="Edit user"
                    @click="openEdit(u)"
                  >
                    <Icon icon="heroicons:pencil-square" class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    :class="iconBtnPhone"
                    title="Update phone number"
                    aria-label="Update phone number"
                    @click="openPhoneUpdate(u)"
                  >
                    <Icon icon="heroicons:device-phone-mobile" class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    :class="iconBtnKey"
                    title="Reset password"
                    aria-label="Reset password"
                    @click="openReset(u)"
                  >
                    <Icon icon="heroicons:key" class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    v-if="isAdmin"
                    type="button"
                    :class="iconBtnTrash"
                    title="Delete user"
                    aria-label="Delete user"
                    @click="confirmDelete(u)"
                  >
                    <Icon icon="heroicons:trash" class="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <footer class="mt-8 flex flex-wrap items-center justify-center gap-3" :class="loading && 'pointer-events-none opacity-45'">
      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
        title="Previous page"
        aria-label="Previous page"
        :disabled="loading || page <= 1"
        @click="page--; load()"
      >
        <Icon icon="heroicons:chevron-left" class="h-5 w-5" aria-hidden="true" />
      </button>
      <span class="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-900/5 dark:bg-zinc-800/50 dark:text-zinc-300 dark:ring-white/10">
        {{ page }} / {{ totalPages() }}
        <span class="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
        {{ total }} users
      </span>
      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
        title="Next page"
        aria-label="Next page"
        :disabled="loading || page >= totalPages()"
        @click="page++; load()"
      >
        <Icon icon="heroicons:chevron-right" class="h-5 w-5" aria-hidden="true" />
      </button>
    </footer>

    <!-- Edit modal -->
    <div v-if="isAdmin && editOpen" :class="dialogBackdrop" @click.self="editOpen = false">
      <div :class="dialogPanel" role="dialog" aria-labelledby="edit-dialog-title">
        <header class="mb-5">
          <h2 id="edit-dialog-title" class="m-0 text-lg font-semibold tracking-tight text-gray-50">Edit user</h2>
        </header>
        <div class="flex flex-col gap-4">
          <label class="m-0 flex flex-col gap-2">
            <span :class="fieldLabel">Name</span>
            <input
              v-model="editForm.name"
              :class="[fieldInput, fieldInvalid(editErrors.name)]"
              type="text"
              autocomplete="off"
              maxlength="120"
              @input="editErrors.name = ''"
            />
            <p v-if="editErrors.name" class="m-0 text-xs font-medium text-red-400">{{ editErrors.name }}</p>
          </label>
          <label class="m-0 flex flex-col gap-2">
            <span :class="fieldLabel">Phone</span>
            <input
              v-model="editForm.phoneNumber"
              :class="`${fieldInput} ${fieldInputReadonly}`"
              type="tel"
              readonly
              maxlength="13"
            />
            <p class="m-0 text-xs text-gray-400">Phone update uses a separate OTP-verified action.</p>
          </label>
          <div class="m-0 flex flex-col gap-2">
            <span :class="fieldLabel">New password</span>
            <PasswordField
              v-model="editForm.password"
              toggle-variant="dark"
              :input-class="fieldInput"
              :error="editErrors.password"
              placeholder="Leave empty to keep current"
              autocomplete="new-password"
              @update:model-value="editErrors.password = ''"
            />
          </div>
        </div>
        <footer class="mt-6 flex flex-wrap justify-end gap-2.5 pt-1">
          <button type="button" :class="btnOutline" @click="editOpen = false">Cancel</button>
          <button type="button" :class="btnPrimary" @click="saveEdit">Save</button>
        </footer>
      </div>
    </div>

    <!-- Register modal -->
    <div v-if="registerOpen" :class="dialogBackdrop" @click.self="registerOpen = false">
      <div :class="dialogPanel" role="dialog" aria-labelledby="register-dialog-title">
        <header class="mb-5">
          <h2 id="register-dialog-title" class="m-0 text-lg font-semibold tracking-tight text-gray-50">Create New User</h2>
          <p class="mt-1.5 text-[0.8125rem] leading-snug text-gray-400">Uses public registration: send OTP, then submit with the code.</p>
        </header>
        <div class="flex flex-col gap-4">
          <label class="m-0 flex flex-col gap-2">
            <span :class="fieldLabel">Full name</span>
            <input
              v-model="regForm.fullName"
              :class="[fieldInput, fieldInvalid(regErrors.fullName)]"
              type="text"
              autocomplete="name"
              maxlength="120"
              @input="regErrors.fullName = ''"
            />
            <p v-if="regErrors.fullName" class="m-0 text-xs font-medium text-red-400">{{ regErrors.fullName }}</p>
          </label>
          <label class="m-0 flex flex-col gap-2">
            <span :class="fieldLabel">Phone</span>
            <input
              v-model="regForm.phoneNumber"
              :class="[fieldInput, fieldInvalid(regErrors.phone)]"
              type="tel"
              autocomplete="tel"
              inputmode="tel"
              maxlength="13"
              placeholder="9647XXXXXXXXX"
              @input="onRegPhoneInput"
            />
            <p v-if="regErrors.phone" class="m-0 text-xs font-medium text-red-400">{{ regErrors.phone }}</p>
          </label>
          <div class="m-0 flex flex-col gap-2">
            <span :class="fieldLabel">Password</span>
            <PasswordField
              v-model="regForm.password"
              toggle-variant="dark"
              :input-class="fieldInput"
              :error="regErrors.password"
              autocomplete="new-password"
              @update:model-value="regErrors.password = ''"
            />
          </div>
          <label class="m-0 flex flex-col gap-2">
            <span :class="fieldLabel">OTP</span>
            <div class="flex items-start gap-2">
              <input
                v-model="regForm.otpCode"
                :class="[fieldInput, fieldInvalid(regErrors.otpCode)]"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="8"
                @input="regErrors.otpCode = ''"
              />
              <button
                v-if="regOtpCooldown === 0"
                type="button"
                :class="btnOutline"
                class="shrink-0 whitespace-nowrap"
                :disabled="!canSendRegOtp"
                @click="sendRegOtp"
              >
                Send OTP
              </button>
              <span
                v-else
                class="inline-flex h-[42px] shrink-0 items-center rounded-[10px] border border-white/20 px-3 text-sm font-medium text-gray-300"
              >
                Resend in {{ regOtpCooldown }}s
              </span>
            </div>
            <p v-if="regErrors.otpCode" class="m-0 text-xs font-medium text-red-400">{{ regErrors.otpCode }}</p>
          </label>
        </div>
        <footer class="mt-6 flex flex-wrap justify-end gap-2.5 pt-1">
          <button type="button" :class="btnPrimary" :disabled="regBusy" @click="submitRegister">Register</button>
        </footer>
      </div>
    </div>

    <!-- Update phone modal -->
    <div v-if="phoneOpen" :class="dialogBackdrop" @click.self="phoneOpen = false">
      <div :class="dialogPanel" role="dialog" aria-labelledby="phone-dialog-title">
        <header class="mb-5">
          <h2 id="phone-dialog-title" class="m-0 text-lg font-semibold tracking-tight text-gray-50">Update phone number</h2>
          <p class="mt-1.5 text-[0.8125rem] leading-snug text-gray-400">
            {{
              phoneTargetUser?.name
                ? `Send OTP to the new number, then confirm to update ${phoneTargetUser.name}.`
                : 'Send OTP to the new number, then confirm.'
            }}
          </p>
        </header>
        <div class="flex flex-col gap-4">
          <label class="m-0 flex flex-col gap-2">
            <span :class="fieldLabel">New phone</span>
            <input
              v-model="phoneForm.phoneNumber"
              :class="[fieldInput, fieldInvalid(phoneErrors.phone)]"
              type="tel"
              autocomplete="tel"
              inputmode="tel"
              maxlength="13"
              placeholder="9647XXXXXXXXX"
              @input="onPhoneUpdateInput"
            />
            <p v-if="phoneErrors.phone" class="m-0 text-xs font-medium text-red-400">{{ phoneErrors.phone }}</p>
          </label>
          <label class="m-0 flex flex-col gap-2">
            <span :class="fieldLabel">OTP</span>
            <div class="flex items-start gap-2">
              <input
                v-model="phoneForm.otpCode"
                :class="[fieldInput, fieldInvalid(phoneErrors.otpCode)]"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="8"
                @input="phoneErrors.otpCode = ''"
              />
              <button
                v-if="phoneOtpCooldown === 0"
                type="button"
                :class="btnOutline"
                class="shrink-0 whitespace-nowrap"
                :disabled="!canSendPhoneOtp"
                @click="sendPhoneOtp"
              >
                Send OTP
              </button>
              <span
                v-else
                class="inline-flex h-[42px] shrink-0 items-center rounded-[10px] border border-white/20 px-3 text-sm font-medium text-gray-300"
              >
                Resend in {{ phoneOtpCooldown }}s
              </span>
            </div>
            <p v-if="phoneErrors.otpCode" class="m-0 text-xs font-medium text-red-400">{{ phoneErrors.otpCode }}</p>
          </label>
        </div>
        <footer class="mt-6 flex flex-wrap justify-end gap-2.5 pt-1">
          <button type="button" :class="btnOutline" :disabled="phoneBusy" @click="phoneOpen = false">Cancel</button>
          <button type="button" :class="btnPrimary" :disabled="phoneBusy" @click="submitPhoneUpdate">Update phone</button>
        </footer>
      </div>
    </div>

    <!-- Reset password modal -->
    <div v-if="resetOpen" :class="dialogBackdrop" @click.self="resetOpen = false">
      <div :class="dialogPanel" role="dialog" aria-labelledby="reset-dialog-title">
        <header class="mb-5">
          <h2 id="reset-dialog-title" class="m-0 text-lg font-semibold tracking-tight text-gray-50">Reset password</h2>
          <p class="mt-1.5 text-[0.8125rem] leading-snug text-gray-400">Sends OTP to the user’s phone, then sets a new password.</p>
        </header>
        <div class="flex flex-col gap-4">
          <label class="m-0 flex flex-col gap-2">
            <span :class="fieldLabel">Phone</span>
            <input
              v-model="resetForm.phoneNumber"
              :class="`${fieldInput} ${fieldInputReadonly}`"
              type="tel"
              readonly
            />
          </label>
          <label class="m-0 flex flex-col gap-2">
            <span :class="fieldLabel">OTP</span>
            <div class="flex items-start gap-2">
              <input
                v-model="resetForm.otpCode"
                :class="[fieldInput, fieldInvalid(resetErrors.otpCode)]"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="8"
                @input="resetErrors.otpCode = ''"
              />
              <button
                v-if="resetOtpCooldown === 0"
                type="button"
                :class="btnOutline"
                class="shrink-0 whitespace-nowrap"
                :disabled="!canSendResetOtp"
                @click="sendResetOtp"
              >
                Send OTP
              </button>
              <span
                v-else
                class="inline-flex h-[42px] shrink-0 items-center rounded-[10px] border border-white/20 px-3 text-sm font-medium text-gray-300"
              >
                Resend in {{ resetOtpCooldown }}s
              </span>
            </div>
            <p v-if="resetErrors.otpCode" class="m-0 text-xs font-medium text-red-400">{{ resetErrors.otpCode }}</p>
          </label>
          <div class="m-0 flex flex-col gap-2">
            <span :class="fieldLabel">New password</span>
            <PasswordField
              v-model="resetForm.newPassword"
              toggle-variant="dark"
              :input-class="fieldInput"
              :error="resetErrors.newPassword"
              autocomplete="new-password"
              @update:model-value="resetErrors.newPassword = ''"
            />
          </div>
        </div>
        <footer class="mt-6 flex flex-wrap justify-end gap-2.5 pt-1">
          <button type="button" :class="btnPrimary" :disabled="resetBusy" @click="submitReset">Update password</button>
        </footer>
      </div>
    </div>
  </div>
</template>