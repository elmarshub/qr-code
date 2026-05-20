"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";
import { themes, type ThemeConfig } from "@/data/themes";
import { fonts, type FontConfig } from "@/data/fonts";
import {
  defaultSettings,
  SETTINGS_STORAGE_KEY,
  FAVOURITES_STORAGE_KEY,
  type AppSettings,
} from "@/data/settings";

interface AppContextType {
  settings: AppSettings;
  currentTheme: ThemeConfig;
  currentFont: FontConfig;
  favourites: string[];
  updateSettings: (partial: Partial<AppSettings>) => void;
  toggleFavourite: (itemId: string) => void;
  isFavourite: (itemId: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {}
  return defaultSettings;
}

function loadFavourites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FAVOURITES_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

//ui function
function applyTheme(theme: ThemeConfig, brandOverride?: string) {
  const root = document.documentElement;
  const colors = theme.colors;
  const brand = brandOverride || colors.brand;

  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--foreground", colors.foreground);
  root.style.setProperty("--card", colors.card);
  root.style.setProperty("--card-foreground", colors.cardForeground);
  root.style.setProperty("--primary", brand);
  root.style.setProperty("--primary-foreground", colors.primaryForeground);
  root.style.setProperty("--secondary", colors.secondary);
  root.style.setProperty("--secondary-foreground", colors.secondaryForeground);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--muted-foreground", colors.mutedForeground);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-foreground", colors.accentForeground);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--input", colors.input);
  root.style.setProperty("--brand", brand);
}

function applyFont(font: FontConfig) {
  document.documentElement.style.setProperty("--font-family", font.fontFamily);

  const existingLink = document.getElementById("google-font-link");
  if (existingLink) existingLink.remove();

  const link = document.createElement("link");
  link.id = "google-font-link";
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.googleFont}&display=swap`;
  document.head.appendChild(link);
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [favourites, setFavourites] = useState<string[]>(loadFavourites);
  const mounted = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    const s = loadSettings();
    const theme = themes.find((t) => t.id === s.themeId) || themes[0];
    const font = fonts.find((f) => f.id === s.fontId) || fonts[0];
    applyTheme(
      theme,
      s.brandColor !== defaultSettings.brandColor ? s.brandColor : undefined,
    );
    applyFont(font);
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));

      if (partial.themeId || partial.brandColor) {
        const theme = themes.find((t) => t.id === next.themeId) || themes[0];
        applyTheme(
          theme,
          next.brandColor !== defaultSettings.brandColor
            ? next.brandColor
            : undefined,
        );
      }
      if (partial.fontId) {
        const font = fonts.find((f) => f.id === next.fontId) || fonts[0];
        applyFont(font);
      }

      return next;
    });
  }, []);

  const toggleFavourite = useCallback((itemId: string) => {
    setFavourites((prev) => {
      const next = prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId];
      localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFavourite = useCallback(
    (itemId: string) => favourites.includes(itemId),
    [favourites],
  );

  const currentTheme =
    themes.find((t) => t.id === settings.themeId) || themes[0];
  const currentFont = fonts.find((f) => f.id === settings.fontId) || fonts[0];

  if (!mounted) {
    return null;
  }

  return (
    <AppContext.Provider
      value={{
        settings,
        currentTheme,
        currentFont,
        favourites,
        updateSettings,
        toggleFavourite,
        isFavourite,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx)
    throw new Error("useAppContext must be used within the AppProvider");
  return ctx;
}
