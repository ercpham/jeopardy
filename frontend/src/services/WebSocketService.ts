import { useAppStore, defaultTeams } from '../store/useAppStore';
import { WsServerMsg } from '../types/bindings/WsServerMsg';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

function getWsUrl(sessionId: string): string {
  const wsBase = API_URL.replace(/^http/, "ws");
  return `${wsBase}/session/${sessionId}/ws`;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private intentionalClose = false;
  // We use this to reconcile the client-side clock with the server
  public lastBuzzAttempt: Map<number, number> = new Map();

  public connect(sessionId: string) {
    this.cleanup();
    this.intentionalClose = false;

    const url = getWsUrl(sessionId);
    this.ws = new WebSocket(url);
    useAppStore.getState().setConnectionState('connecting');

    this.ws.onopen = () => {
      useAppStore.getState().setConnectionState('connected');
      this.reconnectAttempts = 0;
      
      this.sendPing();
      
      this.pingInterval = setInterval(() => {
        this.sendPing();
      }, 3000);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = () => {
      useAppStore.getState().setConnectionState('disconnected');
      this.cleanupLogic();

      if (this.intentionalClose || !useAppStore.getState().sessionId) return;

      useAppStore.getState().setConnectionState('reconnecting');
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts++), 30000);
      
      this.reconnectTimer = setTimeout(() => {
        if (useAppStore.getState().sessionId) {
          this.connect(useAppStore.getState().sessionId!);
        }
      }, delay);
    };

    this.ws.onerror = () => {
      useAppStore.getState().setConnectionState('degraded');
    };
  }

  public disconnect() {
    this.intentionalClose = true;
    this.cleanup();
    useAppStore.getState().setConnectionState('disconnected');
    useAppStore.getState().setPingData(0, 0);
  }

  private cleanupLogic() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.pingInterval = null;
    this.reconnectTimer = null;
  }

  private cleanup() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanupLogic();
  }

  public send(msg: object): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  public sendPing() {
    const clientTimestamp = new Date().toISOString();
    this.send({ type: "Ping", client_timestamp: clientTimestamp });
  }

  private handleMessage(data: string) {
    try {
      const msg: WsServerMsg = JSON.parse(data);
      const store = useAppStore.getState();

      switch (msg.type) {
        case "FullState":
          store.applyFullSessionState(msg.session);
          break;
        case "Pong":
          const pongTime = Date.now();
          const clientSentTime = new Date(msg.client_timestamp).getTime();
          const roundTrip = pongTime - clientSentTime;
          store.setPingData(roundTrip, pongTime);
          if (roundTrip > 2000) {
            store.setConnectionState('degraded');
          } else {
            store.setConnectionState('connected');
          }
          break;
        case "BuzzLocked":
          store.setBuzzLock(true);
          store.setTeams(prev => prev.map((t, i) => ({
            ...t,
            buzz_lock_owned: i === msg.team_index,
            has_buzzed: i === msg.team_index || t.has_buzzed
          })));

          if (msg.team_index !== store.selectedTeam) {
            try {
              const serverTime = new Date(msg.server_timestamp).getTime();
              const echoedClientTime = new Date(msg.client_timestamp).getTime();
              const originalClientTime = this.lastBuzzAttempt.get(store.selectedTeam);

              if (originalClientTime) {
                const roundTripTime = serverTime - originalClientTime;
                const clockSkew = echoedClientTime - (originalClientTime + roundTripTime / 2);
                const timeDiff = serverTime - clockSkew - originalClientTime;

                if (timeDiff >= -100 && timeDiff <= 2100) {
                  const displayDiff = Math.max(0, Math.round(timeDiff));
                  let message = `${msg.team_name} buzzed in ${displayDiff} ms before you!`;
                  if (displayDiff < 50) message = `${msg.team_name} buzzed just before you!`;
                  else if (displayDiff > 1000) message = `${msg.team_name} buzzed ${(displayDiff / 1000).toFixed(1)} seconds before you!`;

                  store.setBuzzFeedback({ visible: true, message });
                  setTimeout(() => {
                    useAppStore.getState().setBuzzFeedback({ visible: false, message: '' });
                  }, 3000);
                }
              }
            } catch (e) {
              console.error(e);
            }
          }
          this.lastBuzzAttempt.delete(store.selectedTeam);
          break;
        case "BuzzReleased":
          store.setBuzzLock(false);
          store.setTeams(prev => prev.map(t => ({
            ...t,
            buzz_lock_owned: false,
            has_buzzed: store.currentPage === "home" ? false : t.has_buzzed
          })));
          break;
        case "ScoreUpdate":
          store.setTeams(prev => prev.map((t, i) => i === msg.team_index ? { ...t, score: msg.score } : t));
          break;
        case "TeamNameUpdate":
          store.setTeams(prev => prev.map((t, i) => i === msg.team_index ? { ...t, team_name: msg.name } : t));
          break;
        case "BuzzersLocked":
          store.setBuzzLock(true);
          store.setTeams(prev => prev.map(t => ({ ...t, buzz_lock_owned: false, has_buzzed: false })));
          break;
        case "HasBuzzedReset":
          store.setBuzzLock(false);
          store.setCurrentPage("home");
          store.setTeams(prev => prev.map(t => ({ ...t, buzz_lock_owned: false, has_buzzed: false })));
          break;
        case "PageUpdate":
          store.setCurrentPage(msg.page);
          break;
        case "DarkModeUpdate":
          store.setDarkMode(msg.enabled);
          break;
        case "TimerEnabledUpdate":
          store.setTimerEnabled(msg.enabled);
          break;
        case "TeamAdded":
          store.setTeams(prev => [...prev, msg.team]);
          break;
        case "TeamRemoved":
          store.setTeams(prev => prev.filter((_, i) => i !== msg.team_index));
          if (store.selectedTeam === msg.team_index) {
            store.setSelectedTeam(Math.max(0, msg.team_index - 1));
          } else if (store.selectedTeam > msg.team_index) {
            store.setSelectedTeam(store.selectedTeam - 1);
          }
          break;
        case "SessionClosed":
          store.setSessionId(null);
          store.setTeams(defaultTeams);
          store.setBuzzLock(false);
          break;
      }
    } catch (e) {
      console.error("Failed to handle WS message", e);
    }
  }
}

export const wsService = new WebSocketService();
