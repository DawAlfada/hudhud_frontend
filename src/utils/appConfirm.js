import { ref } from 'vue'

export const confirmOpen = ref(false)
export const confirmTitle = ref('Confirm')
export const confirmMessage = ref('')
export const confirmConfirmLabel = ref('OK')
export const confirmCancelLabel = ref('Cancel')
/** @type {import('vue').Ref<'default' | 'danger'>} */
export const confirmVariant = ref('default')

/** @type {((value: boolean) => void) | null} */
let _resolver = null

function settle(result) {
  confirmOpen.value = false
  if (_resolver) {
    const r = _resolver
    _resolver = null
    r(result)
  }
}

/**
 * @param {{
 *   title?: string
 *   message: string
 *   confirmLabel?: string
 *   okLabel?: string
 *   cancelLabel?: string
 *   variant?: 'default' | 'danger'
 * }} opts
 * @returns {Promise<boolean>} true if confirmed
 */
export function confirmDialog(opts) {
  return new Promise((resolve) => {
    if (_resolver) _resolver(false)
    confirmTitle.value = opts.title ?? 'Confirm'
    confirmMessage.value = opts.message ?? ''
    confirmConfirmLabel.value = opts.confirmLabel ?? opts.okLabel ?? 'OK'
    confirmCancelLabel.value = opts.cancelLabel ?? 'Cancel'
    confirmVariant.value = opts.variant === 'danger' ? 'danger' : 'default'
    _resolver = resolve
    confirmOpen.value = true
  })
}

export function confirmDialogAccept() {
  settle(true)
}

export function confirmDialogDismiss() {
  settle(false)
}
