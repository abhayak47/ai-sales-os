import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext();

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

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("ai-sales-os:theme") || "enterprise");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ai-sales-os:theme", theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, themes: THEMES }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
