
import { useState, useCallback } from 'react';

const MAX_HISTORY = 100;

export const useUndoableState = <T,>(initialState: T): [
  T,
  (newState: T) => void,
  () => void,
  () => void,
  boolean,
  boolean
] => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const state = history[currentIndex];

  const setState = useCallback((newState: T) => {
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(newState);

    // Limit history size
    while (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
    }
    
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }, [currentIndex, history]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return [state, setState, undo, redo, canUndo, canRedo];
};