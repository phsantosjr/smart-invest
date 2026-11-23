import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50',
  secondary:
    'bg-secondary text-secondary-foreground hover:opacity-90 disabled:opacity-50',
  ghost:
    'bg-transparent text-primary dark:text-secondary hover:bg-accent/30 disabled:opacity-50',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed dark:focus-visible:ring-offset-surface-dark ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}