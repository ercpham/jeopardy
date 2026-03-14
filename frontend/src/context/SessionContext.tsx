import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";

interface SessionTeam {
  team_name: string;
  score: number;
  buzz_lock_owned: boolean;
}

interface SessionState {
  teams: SessionTeam[];
  buzz_lock: boolean;
  dark_mode: boolean;
  timer_enabled: boolean;
  created_at: string;
  last_modified: string;
}

/**
 * SessionContext provides WebSocket-based session lifecycle management.
 * Handles session creation, joining, WebSocket connection, automatic reconnection,
 * and message handler setter for TeamContext.
 */
interface SessionContextProps {
  sessionId: string | null;
  sessionLoading: boolean;
  wsConnected: boolean;
  sessionState: SessionState | null;
  startSession: () => Promise<void>;
  closeSession: () => Promise<void>;
  joinSession: (id: string) => Promise<void>;
  setSessionId: (id: string | null) => void;
  wsRef: React.MutableRefObject<WebSocket | null>;
  /** @deprecated use addWsListener / removeWsListener instead */
  setOnWsMessage: (
    handler: ((event: MessageEvent) => void) | null
  ) => void;
  addWsListener: (handler: (event: MessageEvent) => void) => void;
  removeWsListener: (handler: (event: MessageEvent) => void) => void;
}

const SessionContext = createContext<SessionContextProps | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

/**
 * Derives a WebSocket URL from the HTTP API URL.
 * Converts http:// → ws:// and https:// → wss://
 */
function getWsUrl(sessionId: string): string {
  const wsBase = API_URL.replace(/^http/, "ws");
  return `${wsBase}/session/${sessionId}/ws`;
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onWsMessageRef = useRef<((event: MessageEvent) => void) | null>(null);
  const wsListenersRef = useRef<Set<(event: MessageEvent) => void>>(new Set());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);

  const setOnWsMessage = useCallback(
    (handler: ((event: MessageEvent) => void) | null) => {
      onWsMessageRef.current = handler;
    },
    []
   );

  const addWsListener = useCallback((handler: (event: MessageEvent) => void) => {
    wsListenersRef.current.add(handler);
  }, []);

  const removeWsListener = useCallback((handler: (event: MessageEvent) => void) => {
    wsListenersRef.current.delete(handler);
  }, []);

  const connectWs = useCallback(
    (id: string) => {
      // Clean up any existing connection
      if (wsRef.current) {
        intentionalCloseRef.current = true;
        wsRef.current.close();
        intentionalCloseRef.current = false;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      const url = getWsUrl(id);
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setWsConnected(false);

      ws.onopen = () => {
        setWsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "FullState") {
            setSessionState(msg.session);
          }
        } catch {
          // Ignore unparseable messages
        }
         if (onWsMessageRef.current) {
           onWsMessageRef.current(event);
         }
         wsListenersRef.current.forEach((listener) => listener(event));
       };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;

        // Don't reconnect if close was intentional or session is cleared
        if (intentionalCloseRef.current || sessionId === null) return;

        // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        const attempt = reconnectAttemptsRef.current;
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        reconnectAttemptsRef.current = attempt + 1;

        reconnectTimerRef.current = setTimeout(() => {
          connectWs(id);
        }, delay);
      };

      ws.onerror = () => {
        // Error will trigger onclose, which handles reconnection
      };
    },
    [sessionId]
  );

  // Establish or tear down WebSocket when sessionId changes
  useEffect(() => {
    if (sessionId) {
      intentionalCloseRef.current = false;
      setSessionState(null);
      connectWs(sessionId);
    } else {
      intentionalCloseRef.current = true;
      setSessionState(null);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setWsConnected(false);
    }

    return () => {
      intentionalCloseRef.current = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [sessionId, connectWs]);

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
    } catch (error) {
      console.error("Error closing session:", error);
    }
    setSessionId(null);
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

  const setSessionIdExternally = (id: string | null) => {
    setSessionId(id);
  };

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        sessionLoading,
        wsConnected,
        sessionState,
        startSession,
        closeSession,
        joinSession,
        setSessionId: setSessionIdExternally,
         wsRef,
         setOnWsMessage,
         addWsListener,
         removeWsListener,
       }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextProps => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
