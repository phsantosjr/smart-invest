import type { InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
}

export function TextField({ label, id, className = '', ...rest }: TextFieldProps) {
  return (
    <label htmlFor={id} className="block space-y-1">
      <span className="text-xs font-semibold text-on-surface">{label}</span>
      <input
        id={id}
        className={`w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface tabular-nums outline-none focus:border-primary-fixed focus:ring-2 focus:ring-primary-fixed/40 dark:bg-surface-container-low ${className}`}
        {...rest}
      />
    </label>
  )
}