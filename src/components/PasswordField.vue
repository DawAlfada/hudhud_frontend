<script setup>
import { computed, ref, useId } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  inputClass: { type: String, default: '' },
  error: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: 'current-password' },
  /** Use `dark` for charcoal modal fields (Users admin dialogs). */
  toggleVariant: { type: String, default: 'default', validator: (v) => v === 'default' || v === 'dark' },
})

defineEmits(['update:modelValue'])

const show = ref(false)
const inputId = useId()
const inputType = computed(() => (show.value ? 'text' : 'password'))

const mergedInputClass = computed(() => [
  props.inputClass,
  props.error
    ? props.toggleVariant === 'dark'
      ? 'border-red-400/65 ring-1 ring-red-400/25 focus:border-red-400/50'
      : 'border-red-500/70 ring-1 ring-red-500/25 dark:border-red-400/60 dark:ring-red-400/20'
    : '',
  'pr-11',
])

const toggleLabel = computed(() => (show.value ? 'Hide password' : 'Show password'))

const toggleBtnClass = computed(() =>
  props.toggleVariant === 'dark'
    ? 'text-gray-400 outline-none hover:bg-white/10 hover:text-gray-100 focus-visible:ring-2 focus-visible:ring-[rgb(139,154,204,0.45)]'
    : 'text-zinc-500 outline-none hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100',
)
</script>

<template>
  <div class="w-full">
    <div class="relative">
      <input
        :id="inputId"
        :type="inputType"
        class="w-full"
        :class="mergedInputClass"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :aria-invalid="error ? 'true' : 'false'"
        :aria-describedby="error ? `${inputId}-err` : undefined"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <button
        type="button"
        class="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg transition"
        :class="toggleBtnClass"
        :title="toggleLabel"
        :aria-label="toggleLabel"
        :aria-pressed="show"
        @click.prevent="show = !show"
      >
        <Icon v-if="!show" icon="heroicons:eye" class="h-5 w-5" aria-hidden="true" />
        <Icon v-else icon="heroicons:eye-slash" class="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
    <p
      v-if="error"
      :id="`${inputId}-err`"
      class="mt-1.5 text-[0.8125rem] font-medium text-red-600 dark:text-red-400"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
