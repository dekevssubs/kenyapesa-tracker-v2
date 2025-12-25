import { useState } from 'react'

export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState({
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
    onConfirm: () => {}
  })

  const confirm = ({ title, message, confirmText, cancelText, variant, onConfirm }) => {
    setConfig({
      title: title || 'Confirm Action',
      message: message || 'Are you sure you want to proceed?',
      confirmText: confirmText || 'Confirm',
      cancelText: cancelText || 'Cancel',
      variant: variant || 'danger',
      onConfirm: onConfirm || (() => {})
    })
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
  }

  return {
    isOpen,
    config,
    confirm,
    close
  }
}
