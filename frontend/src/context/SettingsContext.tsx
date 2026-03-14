import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useSession } from "./SessionContext";

interface SettingsContextType {
  darkMode: boolean;
  setDarkMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  timerEnabled: boolean;
  setTimerEnabled: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { sessionId, wsRef, sessionState, addWsListener, removeWsListener } = useSession();
  const [darkMode, setDarkModeLocal] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  const [timerEnabled, setTimerEnabledLocal] = useState(() => {
    const saved = localStorage.getItem("timerEnabled");
    return saved ? JSON.parse(saved) : false;
  });

  // Apply dark mode class to document
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("timerEnabled", JSON.stringify(timerEnabled));
  }, [timerEnabled]);

  // When joining a session, sync initial settings from the FullState snapshot
  useEffect(() => {
    if (sessionId && sessionState) {
      if (typeof sessionState.dark_mode === "boolean") {
        setDarkModeLocal(sessionState.dark_mode);
      }
      if (typeof sessionState.timer_enabled === "boolean") {
        setTimerEnabledLocal(sessionState.timer_enabled);
      }
    }
  // Only run when sessionState reference changes (i.e. on initial FullState receipt)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState]);

  // Listen for incremental setting updates broadcast by the server
  const handleWsMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "DarkModeUpdate") {
        setDarkModeLocal(msg.enabled);
      } else if (msg.type === "TimerEnabledUpdate") {
        setTimerEnabledLocal(msg.enabled);
      }
    } catch {
      // Ignore unparseable messages
    }
  }, []);

  useEffect(() => {
    addWsListener(handleWsMessage);
    return () => removeWsListener(handleWsMessage);
  }, [addWsListener, removeWsListener, handleWsMessage]);

  const setDarkMode = (value: boolean | ((prev: boolean) => boolean)) => {
    // Resolve the new value against current state before touching React state
    setDarkModeLocal((prev: boolean) => {
      const newValue = typeof value === "function" ? (value as (prev: boolean) => boolean)(prev) : value;
      return newValue;
    });
    // Compute new value independently so we can send it over WS outside the updater
    const newValue = typeof value === "function" ? (value as (prev: boolean) => boolean)(darkMode) : value;
    if (sessionId && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "UpdateDarkMode", enabled: newValue }));
    }
  };

  const setTimerEnabled = (value: boolean | ((prev: boolean) => boolean)) => {
    setTimerEnabledLocal((prev: boolean) => {
      const newValue = typeof value === "function" ? (value as (prev: boolean) => boolean)(prev) : value;
      return newValue;
    });
    const newValue = typeof value === "function" ? (value as (prev: boolean) => boolean)(timerEnabled) : value;
    if (sessionId && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "UpdateTimerEnabled", enabled: newValue }));
    }
  };

  return (
    <SettingsContext.Provider
      value={{ darkMode, setDarkMode, timerEnabled, setTimerEnabled }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
