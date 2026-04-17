import { useAppStore } from '../store/useAppStore';
import { wsService } from './WebSocketService';
import { Team } from '../types/bindings/Team';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

export const startSession = async () => {
  const store = useAppStore.getState();
  store.setSessionLoading(true);
  try {
    const response = await fetch(`${API_URL}/session/start`, { method: "POST" });
    const data = await response.json();
    store.setSessionId(data.session_id);
    store.setHostToken(data.host_token);
    wsService.connect(data.session_id);
  } catch (error) {
    console.error("Error starting session:", error);
  } finally {
    store.setSessionLoading(false);
  }
};

export const closeSession = async () => {
  const store = useAppStore.getState();
  const sessionId = store.sessionId;
  const hostToken = store.hostToken;
  if (!sessionId) return;
  try {
    const url = hostToken 
      ? `${API_URL}/session/${sessionId}/close?token=${hostToken}`
      : `${API_URL}/session/${sessionId}/close`;
    await fetch(url, { method: "POST" });
  } catch (error) {
    console.error("Error closing session:", error);
  }
  store.setSessionId(null);
  store.setHostToken(null);
  wsService.disconnect();
};

export const leaveSession = () => {
  const store = useAppStore.getState();
  store.setSessionId(null);
  wsService.disconnect();
};

export const joinSession = async (id: string): Promise<boolean> => {
  const store = useAppStore.getState();
  store.setSessionLoading(true);
  try {
    const response = await fetch(`${API_URL}/session/${id}`);
    if (response.ok) {
      store.setSessionId(id);
      wsService.connect(id);
      return true;
    } else {
      console.error("Invalid session ID.");
      return false;
    }
  } catch (error) {
    console.error("Error joining session:", error);
    return false;
  } finally {
    store.setSessionLoading(false);
  }
};

export const releaseBuzzLock = () => {
  const store = useAppStore.getState();
  const sessionId = store.sessionId;
  
  store.setBuzzLock(false);
  store.setTeams((prev) => prev.map((team) => ({ ...team, buzz_lock_owned: false, has_buzzed: false })));

  if (!sessionId) return;

  if (!wsService.send({ type: "ReleaseBuzz" })) {
    fetch(`${API_URL}/session/${sessionId}/buzz/release`, { method: "POST" }).catch(() => {});
  }
};

export const buzzIn = (teamIndex: number) => {
  const store = useAppStore.getState();
  const teams = store.teams;
  const sessionId = store.sessionId;
  const buzzLock = store.buzzLock;

  if (teams[teamIndex]?.has_buzzed) return;

  if (!sessionId && !buzzLock) {
    store.setBuzzLock(true);
    store.setTeams((prev) =>
      prev.map((team, index) =>
        index === teamIndex
          ? { ...team, buzz_lock_owned: true, has_buzzed: true }
          : { ...team, buzz_lock_owned: false, has_buzzed: team.has_buzzed }
      )
    );
    return;
  }

  if (buzzLock) return;

  const clientSentTime = typeof wsService.getServerTime === "function" 
    ? wsService.getServerTime() 
    : Date.now();
  const clientTimestamp = new Date(clientSentTime).toISOString();
  wsService.lastBuzzAttempt.set(teamIndex, clientSentTime);

  if (wsService.send({ type: "BuzzIn", team_index: teamIndex, client_timestamp: clientTimestamp })) {
    store.setBuzzLock(true);
    store.setTeams((prev) =>
      prev.map((team, index) =>
        index === teamIndex
          ? { ...team, buzz_lock_owned: true, has_buzzed: true }
          : { ...team, buzz_lock_owned: false, has_buzzed: team.has_buzzed }
      )
    );
    return;
  }

  if (!sessionId) return;
  fetch(`${API_URL}/session/${sessionId}/buzz/${teamIndex}`, { method: "POST" })
    .then((response) => {
      if (!response.ok) throw new Error();
      return response.json();
    })
    .then((data) => {
      if (data === "Success") {
        store.setBuzzLock(true);
        store.setTeams((prev) =>
          prev.map((team, index) =>
            index === teamIndex
              ? { ...team, buzz_lock_owned: true, has_buzzed: true }
              : { ...team, buzz_lock_owned: false, has_buzzed: team.has_buzzed }
          )
        );
      }
    })
    .catch(() => {});
};

export const lockBuzzers = () => {
  const store = useAppStore.getState();
  store.setBuzzLock(true);
  if (store.sessionId) {
    wsService.send({ type: "LockBuzzers" });
  }
};

export const modifyTeam = (team: Team, index: number) => {
  const store = useAppStore.getState();
  const sessionId = store.sessionId;
  if (!sessionId) {
    store.setTeams((prev) => prev.map((t, i) => (i === index ? team : t)));
    return;
  }

  fetch(`${API_URL}/session/${sessionId}/teams/${index}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(team),
  })
    .then((response) => response.json())
    .then((data) => {
      store.setTeams((prev) => prev.map((t, i) => (i === index ? data : t)));
    })
    .catch(() => {});
};

export const addTeam = () => {
  const store = useAppStore.getState();
  const sessionId = store.sessionId;
  if (!sessionId) {
    const newTeamIndex = store.teams.length;
    const newTeam: Team = {
      team_name: `Team ${newTeamIndex + 1}`,
      score: 0,
      buzz_lock_owned: false,
      has_buzzed: false,
      last_buzz_attempt: null,
    };
    store.setTeams((prev) => [...prev, newTeam]);
    return;
  }
  wsService.send({ type: "AddTeam" });
};

export const removeTeam = (teamIndex: number) => {
  const store = useAppStore.getState();
  const sessionId = store.sessionId;
  if (!sessionId) {
    store.setTeams((prev) => prev.filter((_, i) => i !== teamIndex));
    store.setSelectedTeam((currentSelected) => {
      if (currentSelected === teamIndex) return Math.max(0, teamIndex - 1);
      else if (currentSelected > teamIndex) return currentSelected - 1;
      return currentSelected;
    });
    return;
  }
  wsService.send({ type: "RemoveTeam", team_index: teamIndex });
};

export const resetBuzzedTeams = () => {
  const store = useAppStore.getState();
  const sessionId = store.sessionId;
  if (!sessionId) {
    store.setTeams((prev) => prev.map((team) => ({ ...team, has_buzzed: false })));
    return;
  }
  wsService.send({ type: "ResetHasBuzzed" });
};

export const updateDarkMode = (enabled: boolean) => {
  const store = useAppStore.getState();
  store.setDarkMode(enabled);
  wsService.send({ type: "UpdateDarkMode", enabled });
};

export const updateTimerEnabled = (enabled: boolean) => {
  const store = useAppStore.getState();
  store.setTimerEnabled(enabled);
  wsService.send({ type: "UpdateTimerEnabled", enabled });
};
