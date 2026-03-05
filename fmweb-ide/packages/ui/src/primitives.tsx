import type { CSSProperties, PropsWithChildren, ReactNode } from "react";

import type { ThemeTokens } from "@fmweb/shared";

const toStyle = (style?: CSSProperties): CSSProperties => {
  if (style === undefined) {
    return {};
  }

  return style;
};

export const Container = ({
  children,
  style,
  className
}: PropsWithChildren<{ style?: CSSProperties; className?: string }>) => {
  return (
    <div className={className} style={toStyle(style)}>
      {children}
    </div>
  );
};

export const Card = ({
  children,
  style,
  className
}: PropsWithChildren<{ style?: CSSProperties; className?: string }>) => {
  return (
    <div
      className={className}
      style={{
        border: "1px solid var(--theme-color-border, #cbd5e1)",
        borderRadius: "var(--theme-radii-md, 8px)",
        background: "var(--theme-color-surface, #fff)",
        padding: "var(--theme-spacing-md, 12px)",
        ...toStyle(style)
      }}
    >
      {children}
    </div>
  );
};

export const Heading = ({
  children,
  level = 2,
  style
}: {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  style?: CSSProperties;
}) => {
  const Tag = `h${level}` as const;

  return <Tag style={toStyle(style)}>{children}</Tag>;
};

export const Text = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => {
  return <p style={toStyle(style)}>{children}</p>;
};

export const Button = ({
  children,
  onClick,
  style,
  disabled,
  type = "button"
}: PropsWithChildren<{
  onClick?: () => void;
  style?: CSSProperties;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}>) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "1px solid var(--theme-color-primary, #2563eb)",
        borderRadius: "var(--theme-radii-sm, 4px)",
        background: "var(--theme-color-primary, #2563eb)",
        color: "#fff",
        padding: "6px 10px",
        cursor: "pointer",
        ...toStyle(style)
      }}
    >
      {children}
    </button>
  );
};

export const Input = ({
  value,
  onChange,
  placeholder,
  style,
  type = "text"
}: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  style?: CSSProperties;
  type?: string;
}) => {
  return (
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(event) => onChange?.(event.target.value)}
      style={{
        border: "1px solid var(--theme-color-border, #cbd5e1)",
        borderRadius: "var(--theme-radii-sm, 4px)",
        padding: "6px 8px",
        ...toStyle(style)
      }}
    />
  );
};

export const Select = ({
  value,
  options,
  onChange,
  style
}: {
  value?: string;
  options: Array<{ value: string; label: string }>;
  onChange?: (value: string) => void;
  style?: CSSProperties;
}) => {
  return (
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      style={{
        border: "1px solid var(--theme-color-border, #cbd5e1)",
        borderRadius: "var(--theme-radii-sm, 4px)",
        padding: "6px 8px",
        ...toStyle(style)
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export const themeTokensToCssVariables = (tokens: ThemeTokens): CSSProperties => {
  return {
    "--theme-font-family": tokens.typography.fontFamily,
    "--theme-font-size": tokens.typography.baseSize,
    "--theme-spacing-xs": tokens.spacing.xs,
    "--theme-spacing-sm": tokens.spacing.sm,
    "--theme-spacing-md": tokens.spacing.md,
    "--theme-spacing-lg": tokens.spacing.lg,
    "--theme-spacing-xl": tokens.spacing.xl,
    "--theme-radii-sm": tokens.radii.sm,
    "--theme-radii-md": tokens.radii.md,
    "--theme-radii-lg": tokens.radii.lg,
    "--theme-color-background": tokens.colors.background,
    "--theme-color-surface": tokens.colors.surface,
    "--theme-color-text": tokens.colors.text,
    "--theme-color-primary": tokens.colors.primary,
    "--theme-color-danger": tokens.colors.danger,
    "--theme-color-border": tokens.colors.border
  } as CSSProperties;
};
