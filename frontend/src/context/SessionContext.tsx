import React, { createContext, useContext, useState } from "react";

/**
 * SessionContext provides state management for user sessions in the application.
 * 
 * This context is used to manage the session ID and handle session-related operations.
 */
interface SessionContextProps {
  sessionId: string | null;
  sessionLoading: boolean;
  startSession: () => Promise<void>;
  closeSession: () => Promise<void>;
  joinSession: (id: string) => Promise<void>;
  setSessionId: (id: string | null) => void;
}

const SessionContext = createContext<SessionContextProps | undefined>(
  undefined
);

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

/**
 * SessionProvider component wraps its children with the SessionContext.
 * 
 * Props:
 * - `children`: The child components that will have access to the SessionContext.
 */
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState<boolean>(false);

  const startSession = async () => {
    setSessionLoading(true); 
    try {
      const response = await fetch(`${API_URL}/session/start`, {
        method: "POST",
      });
      const id = await response.json();
      setSessionId(id);
    } catch (error) {
      console.error("Error starting session:", error);
    } finally {
      setSessionLoading(false);
    }
  };

  const closeSession = async () => {
    if (!sessionId) return;

    try {
      await fetch(`${API_URL}/session/${sessionId}/close`, {
        method: "POST",
      });
      setSessionId(null);
    } catch (error) {
      console.error("Error closing session:", error);
    }
  };

  const joinSession = async (id: string) => {
    setSessionLoading(true); 
    try {
      const response = await fetch(`${API_URL}/session/${id}`);
      if (response.ok) {
        setSessionId(id);
      } else {
        console.error("Invalid session ID or session not found.");
      }
    } catch (error) {
      console.error("Error joining session:", error);
    } finally {
      setSessionLoading(false);
    }
  };

  /**
   * Sets the session ID to a new value.
   * 
   * Parameters:
   * - `id`: The new session ID to be set.
   */
  const setSessionIdExternally = (id: string | null) => {
    setSessionId(id);
  };

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        sessionLoading,
        startSession,
        closeSession,
        joinSession,
        setSessionId: setSessionIdExternally,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

/**
 * useSession is a custom hook to access the SessionContext.
 * 
 * Throws an error if used outside of a SessionProvider.
 * 
 * Returns:
 * - `SessionContextProps`: The context value containing sessionId and setSessionId.
 */
export const useSession = (): SessionContextProps => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
