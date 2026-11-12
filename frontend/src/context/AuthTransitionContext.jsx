import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const AuthTransitionContext = createContext(null);

/**
 * AuthTransitionProvider — Manages login & logout visual transition lifecycles
 * independently of authentication state.
 *
 * Keeps visual motion and stage timing separate from core AuthContext tokens and RBAC credentials.
 */
export function AuthTransitionProvider({ children }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMode, setTransitionMode] = useState(null); // 'login' | 'logout' | null
  const [onCompleteCallback, setOnCompleteCallback] = useState(null);
  const activeLockRef = useRef(false);

  const startLoginTransition = useCallback((onComplete) => {
    if (activeLockRef.current) return;
    activeLockRef.current = true;
    setIsTransitioning(true);
    setTransitionMode('login');
    setOnCompleteCallback(() => onComplete);
  }, []);

  const startLogoutTransition = useCallback((onComplete) => {
    if (activeLockRef.current) return;
    activeLockRef.current = true;
    setIsTransitioning(true);
    setTransitionMode('logout');
    setOnCompleteCallback(() => onComplete);
  }, []);

  const endTransition = useCallback(() => {
    activeLockRef.current = false;
    setIsTransitioning(false);
    setTransitionMode(null);
    setOnCompleteCallback(null);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    if (onCompleteCallback) {
      onCompleteCallback();
    }
    endTransition();
  }, [onCompleteCallback, endTransition]);

  return (
    <AuthTransitionContext.Provider
      value={{
        isTransitioning,
        transitionMode,
        startLoginTransition,
        startLogoutTransition,
        endTransition,
        handleAnimationComplete
      }}
    >
      {children}
    </AuthTransitionContext.Provider>
  );
}

/**
 * useAuthTransition hook with safe fallback for isolated component testing.
 */
export function useAuthTransition() {
  const context = useContext(AuthTransitionContext);
  if (!context) {
    return {
      isTransitioning: false,
      transitionMode: null,
      startLoginTransition: (onComplete) => onComplete?.(),
      startLogoutTransition: (onComplete) => onComplete?.(),
      endTransition: () => {},
      handleAnimationComplete: () => {}
    };
  }
  return context;
}

export default AuthTransitionContext;

