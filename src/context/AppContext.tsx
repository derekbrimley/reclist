import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, Recommendation } from '../types/index';
import { loadState, saveState, generateId } from '../utils/storage';

type Action =
  | { type: 'SET_AUTHORIZED'; payload: boolean }
  | { type: 'SET_KEEPER_PLAYLIST'; payload: { id: string; name: string } }
  | { type: 'ADD_RECOMMENDATION'; payload: Omit<Recommendation, 'id' | 'createdAt'> }
  | { type: 'REMOVE_RECOMMENDATION'; payload: string }
  | { type: 'UPDATE_RECOMMENDATION'; payload: { id: string; updates: Partial<Recommendation> } }
  | { type: 'SET_ARTIST_KEEP_COUNT'; payload: number }
  | { type: 'CLEAR_ALL' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_AUTHORIZED':
      return { ...state, isAuthorized: action.payload };

    case 'SET_KEEPER_PLAYLIST':
      return {
        ...state,
        keeperPlaylistId: action.payload.id,
        keeperPlaylistName: action.payload.name,
      };

    case 'ADD_RECOMMENDATION':
      const newRec: Recommendation = {
        ...action.payload,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        recommendations: [newRec, ...state.recommendations],
      };

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

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
