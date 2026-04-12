import { create } from 'zustand';
import { Team } from '../types/bindings/Team';
import { Session } from '../types/bindings/Session';
import { Question } from '../types/Question';
import questionsData from '../data/sample_questions.json';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'degraded';

export interface BuzzFeedback {
  visible: boolean;
  message: string;
}

export const defaultTeams: Team[] = [
  { team_name: "Team 1", score: 0, buzz_lock_owned: false, has_buzzed: false, last_buzz_attempt: null },
  { team_name: "Team 2", score: 0, buzz_lock_owned: false, has_buzzed: false, last_buzz_attempt: null },
  { team_name: "Team 3", score: 0, buzz_lock_owned: false, has_buzzed: false, last_buzz_attempt: null },
];

const savedDarkMode = localStorage.getItem("darkMode");
const savedTimerEnabled = localStorage.getItem("timerEnabled");

interface AppState {
  // Session / Connection State
  sessionId: string | null;
  sessionLoading: boolean;
  connectionState: ConnectionState;
  pingLatency: number | null;
  lastPingTime: number | null;

  // Settings
  darkMode: boolean;
  timerEnabled: boolean;

  // Questions / Board State
  questions: Question[];
  clickedCells: Set<string>;
  recentlyClickedIndex: number | null;
  targetScore: number | null;
  editableCategories: string[];
  sourceCategoriesKey: string;

  // Game / Team State
  currentPage: string; // usually "home" or "question"
  teams: Team[];
  buzzLock: boolean;
  selectedTeam: number;
  buzzFeedback: BuzzFeedback;
  hasPlayedBuzzer: boolean;

  // Actions
  setSessionId: (id: string | null) => void;
  setSessionLoading: (loading: boolean) => void;
  setConnectionState: (state: ConnectionState) => void;
  setPingData: (latency: number, time: number) => void;
  
  setDarkMode: (value: boolean) => void;
  setTimerEnabled: (value: boolean) => void;
  
  setQuestions: (questions: Question[]) => void;
  revealAnswer: (id: string) => void;
  resetQuestions: () => void;
  
  setClickedCells: (cells: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setRecentlyClickedIndex: (index: number | null) => void;
  setTargetScore: (score: number | null) => void;
  setEditableCategories: (categories: string[] | ((prev: string[]) => string[])) => void;
  setSourceCategoriesKey: (key: string) => void;
  resetClickedCells: () => void;

  setCurrentPage: (page: string) => void;
  setTeams: (teams: Team[] | ((prev: Team[]) => Team[])) => void;
  setBuzzLock: (locked: boolean) => void;
  setSelectedTeam: (index: number | ((prev: number) => number)) => void;
  setBuzzFeedback: (feedback: BuzzFeedback) => void;
  setHasPlayedBuzzer: (played: boolean) => void;
  
  applyFullSessionState: (session: Session) => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  sessionId: null,
  sessionLoading: false,
  connectionState: 'disconnected',
  pingLatency: null,
  lastPingTime: null,

  darkMode: savedDarkMode ? JSON.parse(savedDarkMode) : false,
  timerEnabled: savedTimerEnabled ? JSON.parse(savedTimerEnabled) : false,

  questions: questionsData as Question[],
  clickedCells: new Set(),
  recentlyClickedIndex: null,
  targetScore: null,
  editableCategories: [],
  sourceCategoriesKey: "",

  currentPage: "home",
  teams: defaultTeams,
  buzzLock: false,
  selectedTeam: 0,
  buzzFeedback: { visible: false, message: '' },
  hasPlayedBuzzer: false,

  setSessionId: (id) => set({ sessionId: id }),
  setSessionLoading: (loading) => set({ sessionLoading: loading }),
  setConnectionState: (state) => set({ connectionState: state }),
  setPingData: (latency, time) => set({ pingLatency: latency, lastPingTime: time }),

  setDarkMode: (value) => {
    localStorage.setItem("darkMode", JSON.stringify(value));
    if (value) {
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
    }
    set({ darkMode: value });
  },
  setTimerEnabled: (value) => {
    localStorage.setItem("timerEnabled", JSON.stringify(value));
    set({ timerEnabled: value });
  },

  setQuestions: (questions) => set({ questions }),
  revealAnswer: (id) => set((state) => ({
    questions: state.questions.map(q => q.id === id ? { ...q, revealed: true } : q)
  })),
  resetQuestions: () => set((state) => ({
    questions: state.questions.map(q => ({ ...q, revealed: false }))
  })),

  setClickedCells: (cellsOrUpdate) => set((state) => ({
    clickedCells: typeof cellsOrUpdate === 'function' ? cellsOrUpdate(state.clickedCells) : cellsOrUpdate
  })),
  setRecentlyClickedIndex: (index) => set({ recentlyClickedIndex: index }),
  setTargetScore: (score) => set({ targetScore: score }),
  setEditableCategories: (catsOrUpdate) => set((state) => ({
    editableCategories: typeof catsOrUpdate === 'function' ? catsOrUpdate(state.editableCategories) : catsOrUpdate
  })),
  setSourceCategoriesKey: (key) => set({ sourceCategoriesKey: key }),
  resetClickedCells: () => set({
    clickedCells: new Set(),
    targetScore: 0,
    editableCategories: [],
    sourceCategoriesKey: ""
  }),

  setCurrentPage: (page) => set({ currentPage: page }),
  setTeams: (teamsOrUpdate) => set((state) => ({
    teams: typeof teamsOrUpdate === 'function' ? teamsOrUpdate(state.teams) : teamsOrUpdate
  })),
  setBuzzLock: (locked) => {
    const prevLocked = get().buzzLock;
    if (locked && !prevLocked && !get().hasPlayedBuzzer) {
      const buzzerSound = new Audio("/sounds/buzz.mp3");
      buzzerSound.play().catch(() => {});
      set({ hasPlayedBuzzer: true });
    }
    if (!locked) {
      set({ hasPlayedBuzzer: false });
    }
    set({ buzzLock: locked });
  },
  setSelectedTeam: (indexOrUpdate) => set((state) => ({
    selectedTeam: typeof indexOrUpdate === 'function' ? indexOrUpdate(state.selectedTeam) : indexOrUpdate
  })),
  setBuzzFeedback: (feedback) => set({ buzzFeedback: feedback }),
  setHasPlayedBuzzer: (played) => set({ hasPlayedBuzzer: played }),

  applyFullSessionState: (session) => {
    const { teams, buzz_lock, dark_mode, timer_enabled, current_page } = session;
    get().setTeams(teams);
    get().setBuzzLock(buzz_lock);
    get().setDarkMode(dark_mode);
    get().setTimerEnabled(timer_enabled);
    if (current_page) {
      get().setCurrentPage(current_page);
    }
  }
}));
