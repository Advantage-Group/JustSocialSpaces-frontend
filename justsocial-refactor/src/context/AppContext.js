import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial state
const initialState = {
  user: null,
  posts: [],
  loading: false,
  notifications: [],
  messages: [],
  theme: 'dark',
  sidebarCollapsed: false,
  currentPage: 'home'
};

// Action types
export const ActionTypes = {
  SET_USER: 'SET_USER',
  SET_POSTS: 'SET_POSTS',
  ADD_POST: 'ADD_POST',
  REMOVE_POST: 'REMOVE_POST',
  UPDATE_POST: 'UPDATE_POST',
  SET_LOADING: 'SET_LOADING',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  LOGOUT: 'LOGOUT'
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_USER:
      return { ...state, user: action.payload };
    
    case ActionTypes.SET_POSTS:
      return { ...state, posts: action.payload };
    
    case ActionTypes.ADD_POST:
      return { ...state, posts: [action.payload, ...state.posts] };
    
    case ActionTypes.REMOVE_POST:
      return { ...state, posts: state.posts.filter(p => p._id !== action.payload) };
    
    case ActionTypes.UPDATE_POST:
      return { ...state, posts: state.posts.map(p => p._id === action.payload._id ? action.payload : p) };
    
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ActionTypes.ADD_NOTIFICATION:
      return { 
        ...state, 
        notifications: [...state.notifications, { 
          id: Date.now(), 
          ...action.payload 
        }] 
      };
    
    case ActionTypes.REMOVE_NOTIFICATION:
      return { 
        ...state, 
        notifications: state.notifications.filter(n => n.id !== action.payload) 
      };
    
    case ActionTypes.SET_MESSAGES:
      return { ...state, messages: action.payload };
    
    case ActionTypes.ADD_MESSAGE:
      return { ...state, messages: [...state.messages, action.payload] };
    
    case ActionTypes.TOGGLE_SIDEBAR:
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    
    case ActionTypes.SET_CURRENT_PAGE:
      return { ...state, currentPage: action.payload };
    
    case ActionTypes.LOGOUT:
      return { ...initialState };
    
    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load user data on mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (userData && token) {
      try {
        const parsedUser = JSON.parse(userData);
        dispatch({ type: ActionTypes.SET_USER, payload: parsedUser });
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    if (state.notifications.length > 0) {
      const latestNotification = state.notifications[state.notifications.length - 1];
      const timer = setTimeout(() => {
        dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: latestNotification.id });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [state.notifications]);

  const value = {
    state,
    dispatch,
    // Helper functions
    showNotification: (message, type = 'info') => {
      dispatch({ 
        type: ActionTypes.ADD_NOTIFICATION, 
        payload: { message, type } 
      });
    },
    logout: () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      dispatch({ type: ActionTypes.LOGOUT });
    }
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;

