import { useState, useEffect, useCallback, useRef } from 'react';

interface UseBlurOnUnfocusProps {
  enabled: boolean;
  blurDelay?: number; // Delay in ms before blurring (prevents accidental blurs)
}

interface UseBlurOnUnfocusReturn {
  isBlurred: boolean;
  manualBlur: () => void;
  manualUnblur: () => void;
}

/**
 * Hook to blur content when user switches tabs or apps
 * Prevents shoulder-surfing - works completely offline
 */
export function useBlurOnUnfocus({ 
  enabled, 
  blurDelay = 500 
}: UseBlurOnUnfocusProps): UseBlurOnUnfocusReturn {
  const [isBlurred, setIsBlurred] = useState(false);
  const [isManuallyBlurred, setIsManuallyBlurred] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const manualBlur = useCallback(() => {
    setIsManuallyBlurred(true);
    setIsBlurred(true);
  }, []);

  const manualUnblur = useCallback(() => {
    setIsManuallyBlurred(false);
    setIsBlurred(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsBlurred(false);
      return;
    }

    let blurTimer: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs - start blur timer
        blurTimer = setTimeout(() => {
          if (!isManuallyBlurred) {
            setIsBlurred(true);
          }
        }, blurDelay);
      } else {
        // User came back - clear timer and unblur
        if (blurTimer) {
          clearTimeout(blurTimer);
          blurTimer = null;
        }
        if (!isManuallyBlurred) {
          setIsBlurred(false);
        }
      }
    };

    const handleWindowBlur = () => {
      // Window lost focus (switched apps)
      blurTimer = setTimeout(() => {
        if (!isManuallyBlurred) {
          setIsBlurred(true);
        }
      }, blurDelay);
    };

    const handleWindowFocus = () => {
      // Window gained focus
      if (blurTimer) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
      if (!isManuallyBlurred) {
        setIsBlurred(false);
      }
    };

    // Listen for visibility change (tab switching)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for window focus/blur (app switching)
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      if (blurTimer) {
        clearTimeout(blurTimer);
      }
    };
  }, [enabled, blurDelay, isManuallyBlurred]);

  return {
    isBlurred,
    manualBlur,
    manualUnblur
  };
}

export default useBlurOnUnfocus;
