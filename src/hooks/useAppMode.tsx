import { createContext, useContext, useState, ReactNode } from "react";

export type AppMode = "personal" | "business";

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>(() => {
    const savedMode = localStorage.getItem("app-mode");
    return (savedMode as AppMode) || "personal";
  });

  const handleSetMode = (newMode: AppMode) => {
    setMode(newMode);
    localStorage.setItem("app-mode", newMode);
  };

  const toggleMode = () => {
    const newMode = mode === "personal" ? "business" : "personal";
    handleSetMode(newMode);
  };

  return (
    <AppModeContext.Provider value={{ mode, setMode: handleSetMode, toggleMode }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error("useAppMode must be used within an AppModeProvider");
  }
  return context;
}