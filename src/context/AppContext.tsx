import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, Recommendation } from '../types/index';
import { loadState, saveState, generateId } from '../utils/storage';

type Action =
  | { type: 'SET_AUTHORIZED'; payload: boolean }
  | { type: 'SET_USER_ID'; payload: string | null }
  | { type: 'SET_KEEPER_PLAYLIST'; payload: { id: string; name: string } }
  | { type: 'ADD_RECOMMENDATION'; payload: Omit<Recommendation, 'id' | 'createdAt'> }
  | { type: 'REMOVE_RECOMMENDATION'; payload: string }
  | { type: 'UPDATE_RECOMMENDATION'; payload: { id: string; updates: Partial<Recommendation> } }
  | { type: 'SET_ARTIST_KEEP_COUNT'; payload: number }
  | { type: 'CLEAR_ALL' }
  | { type: 'HYDRATE_FROM_SERVER'; payload: { recommendations: Recommendation[]; settings: { keeperPlaylistId: string | null; keeperPlaylistName: string | null; artistKeepCount: number } } }
  | { type: 'SYNC_ADD'; payload: Recommendation }
  | { type: 'SYNC_REMOVE'; payload: string }
  | { type: 'SYNC_UPDATE'; payload: Recommendation };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_AUTHORIZED':
      return { ...state, isAuthorized: action.payload };

    case 'SET_USER_ID':
      return { ...state, userId: action.payload };

    case 'SET_KEEPER_PLAYLIST':
      return {
        ...state,
        keeperPlaylistId: action.payload.id,
        keeperPlaylistName: action.payload.name,
      };

    case 'ADD_RECOMMENDATION': {
      const newRec: Recommendation = {
        ...action.payload,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        recommendations: [newRec, ...state.recommendations],
      };
    }

    case 'REMOVE_RECOMMENDATION':
      return {
        ...state,
        recommendations: state.recommendations.filter((r) => r.id !== action.payload),
      };

    case 'UPDATE_RECOMMENDATION':
      return {
        ...state,
        recommendations: state.recommendations.map((r) =>
          r.id === action.payload.id ? { ...r, ...action.payload.updates } : r
        ),
      };

    case 'SET_ARTIST_KEEP_COUNT':
      return { ...state, artistKeepCount: action.payload };

    case 'CLEAR_ALL':
      return { ...state, recommendations: [] };

    case 'HYDRATE_FROM_SERVER':
      return {
        ...state,
        isHydrated: true,
        recommendations: action.payload.recommendations,
        keeperPlaylistId: action.payload.settings.keeperPlaylistId,
        keeperPlaylistName: action.payload.settings.keeperPlaylistName,
        artistKeepCount: action.payload.settings.artistKeepCount,
      };

    case 'SYNC_ADD': {
      // Avoid duplicates from Realtime echo
      if (state.recommendations.some((r) => r.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        recommendations: [action.payload, ...state.recommendations],
      };
    }

    case 'SYNC_REMOVE':
      return {
        ...state,
        recommendations: state.recommendations.filter((r) => r.id !== action.payload),
      };

    case 'SYNC_UPDATE': {
      return {
        ...state,
        recommendations: state.recommendations.map((r) =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    }

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);

  // Save to localStorage as offline cache whenever state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
