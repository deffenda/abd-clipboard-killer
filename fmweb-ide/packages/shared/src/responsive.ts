import type { Breakpoint, ComponentStyle } from "./types";

const toBreakpointMap = (breakpoints: Breakpoint[]) => {
  return [...breakpoints].sort((a, b) => a.minWidth - b.minWidth);
};

export const mergeResponsiveStyle = (
  style: {
    base?: ComponentStyle;
    byBreakpoint?: Record<string, ComponentStyle>;
  },
  activeBreakpointName: string,
  breakpoints: Breakpoint[]
): ComponentStyle => {
  const base = style.base ?? {};
  const overrides = style.byBreakpoint ?? {};
  const sorted = toBreakpointMap(breakpoints);
  const active = sorted.find((item) => item.name === activeBreakpointName);

  if (active === undefined) {
    return { ...base };
  }

  const merged: ComponentStyle = { ...base };

  for (const breakpoint of sorted) {
    if (breakpoint.minWidth > active.minWidth) {
      break;
    }

    const value = overrides[breakpoint.name];
    if (value !== undefined) {
      Object.assign(merged, value);
    }
  }

  return merged;
};

export const styleToInlineCss = (style: ComponentStyle): Record<string, string> => {
  const css: Record<string, string> = {};

  for (const [key, value] of Object.entries(style)) {
    if (value !== undefined) {
      css[key] = value;
    }
  }

  return css;
};
