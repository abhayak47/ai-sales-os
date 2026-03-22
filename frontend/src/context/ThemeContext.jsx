import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext();

const STORAGE_KEY = "ai-sales-os:theme-v2";
const LEGACY_KEY = "ai-sales-os:theme";
/** One-time: ensures users see the new CRM look after upgrade (still overridable in Appearance). */
const CRM_BOOT_KEY = "ai-sales-os:crm-layout-boot-v1";

export const THEMES = {
  enterprise: {
    label: "CRM",
    description: "Light enterprise layout similar to Zoho or HubSpot.",
  },
  dark: {
    label: "Midnight",
    description: "High-contrast dark workspace.",
  },
  light: {
    label: "Canvas",
    description: "Clean light workspace for long sessions.",
  },
  slate: {
    label: "Slate",
    description: "Muted professional grey-blue workspace.",
  },
};

function readInitialTheme() {
  if (typeof window === "undefined") return "enterprise";

  const v2 = window.localStorage.getItem(STORAGE_KEY);
  if (v2 && THEMES[v2]) return v2;

  const legacy = window.localStorage.getItem(LEGACY_KEY);
  if (legacy && THEMES[legacy]) {
    window.localStorage.setItem(STORAGE_KEY, legacy);
    return legacy;
  }

  if (!window.localStorage.getItem(CRM_BOOT_KEY)) {
    window.localStorage.setItem(STORAGE_KEY, "enterprise");
    window.localStorage.setItem(CRM_BOOT_KEY, "1");
    return "enterprise";
  }

  return "enterprise";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, themes: THEMES }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
