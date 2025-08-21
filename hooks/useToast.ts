import { useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState {
  toasts: Toast[];
}

let listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(action: { type: string; payload?: any }) {
  switch (action.type) {
    case 'ADD_TOAST':
      memoryState = {
        toasts: [...memoryState.toasts, action.payload],
      };
      break;
    case 'REMOVE_TOAST':
      memoryState = {
        toasts: memoryState.toasts.filter(t => t.id !== action.payload),
      };
      break;
    case 'CLEAR_TOASTS':
      memoryState = { toasts: [] };
      break;
  }
  
  listeners.forEach(listener => listener(memoryState));
}

export function useToast() {
  const [state, setState] = useState<ToastState>(memoryState);
  
  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter(l => l !== setState);
    };
  }, []);
  
  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = options.duration ?? 5000;
    
    dispatch({
      type: 'ADD_TOAST',
      payload: { ...options, id },
    });
    
    if (duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', payload: id });
      }, duration);
    }
    
    return id;
  }, []);
  
  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, []);
  
  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR_TOASTS' });
  }, []);
  
  return {
    toasts: state.toasts,
    toast,
    dismiss,
    clear,
  };
}