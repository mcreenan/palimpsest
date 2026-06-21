import type { ReactNode } from "react";

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
}

/**
 * The one button. Every app imports this — do not reimplement a button in an app.
 * Variants and sizing come from the design tokens in `tokens.css`.
 */
export function Button({ children, onClick, href, variant = "primary", disabled }: ButtonProps) {
  const className = `btn btn--${variant}`;
  if (href) {
    return (
      <a className={className} href={href} aria-disabled={disabled}>
        {children}
      </a>
    );
  }
  return (
    <button className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
