import type { AppState, Recommendation } from '../types/index';

const STORAGE_KEY = 'reclist_state';

const DEFAULT_STATE: AppState = {
  isAuthorized: false,
  keeperPlaylistId: null,
  keeperPlaylistName: null,
  artistKeepCount: 10,
  recommendations: [],
};

export function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_STATE, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load state from localStorage:', e);
  }
  return DEFAULT_STATE;
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

export function addRecommendation(state: AppState, rec: Recommendation): AppState {
  return {
    ...state,
    recommendations: [rec, ...state.recommendations],
  };
}

export function removeRecommendation(state: AppState, id: string): AppState {
  return {
    ...state,
    recommendations: state.recommendations.filter((r) => r.id !== id),
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
