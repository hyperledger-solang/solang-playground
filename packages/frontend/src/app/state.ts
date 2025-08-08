import { isDarkTheme } from "@/lib/theme";
import { generateRandomId } from "@/lib/utils";
import { atom, useSetAtom } from "jotai";
import { create } from "zustand";
import { combine } from "zustand/middleware";

export const ConsoleState = atom<{ id: string; message: string }[]>([]);

export function useAddConsole() {
  const setState = useSetAtom(ConsoleState);
  return (message: string) => {
    const id = generateRandomId();
    setState((state) => [...state, { id, message }]);
  };
}

export const useSettingsStore = create(
  combine(
    {
      monacoTheme: isDarkTheme() ? "vs-dark" : "vs-light",
    },
    (set) => ({
      setMonacoTheme(theme: "vs-dark" | "vs-light") {
        set((state) => ({ ...state, monacoTheme: theme }));
      },
    }),
  ),
);

export enum SidebarView {
  FILE_EXPLORER = "FILE-EXPLORER",
  SETTINGS = "SETTINGS",
  COMPILE = "COMPILE",
  DEPLOY = "DEPLOY",
}

export const useAppStore = create(
  combine(
    {
      sidebar: SidebarView.FILE_EXPLORER,
    },
    (set) => ({
      setSidebar(sidebar: SidebarView) {
        set((state) => ({ ...state, sidebar }));
      },
    }),
  ),
);
