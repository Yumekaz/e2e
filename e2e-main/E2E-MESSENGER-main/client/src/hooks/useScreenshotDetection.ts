import { useEffect, useCallback, useRef } from 'react';

interface UseScreenshotDetectionProps {
  onScreenshot: () => void;
  enabled: boolean;
}

/**
 * Hook to detect screenshot attempts using various browser APIs
 * Works completely offline - no internet needed
 */
export function useScreenshotDetection({ onScreenshot, enabled }: UseScreenshotDetectionProps): void {
  const lastKeyTime = useRef<number>(0);
  const keySequence = useRef<string[]>([]);

  const handleScreenshot = useCallback(() => {
    if (enabled) {
      onScreenshot();
    }
  }, [onScreenshot, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Method 1: Detect PrintScreen key
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        handleScreenshot();
        return;
      }

      // Windows + Shift + S (Snipping Tool)
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 's') {
        handleScreenshot();
        return;
      }

      // Cmd + Shift + 3/4 (Mac screenshot)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        handleScreenshot();
        return;
      }

      // Track key sequence for Ctrl+Shift+S or similar combinations
      keySequence.current.push(e.key);
      if (keySequence.current.length > 3) {
        keySequence.current.shift();
      }

      // Check for screenshot key combinations
      const seq = keySequence.current.join('+').toLowerCase();
      if (seq.includes('control+shift+s') || seq.includes('command+shift+s')) {
        handleScreenshot();
      }

      lastKeyTime.current = now;
    };

    // Method 2: Detect visibility change (some screenshot tools trigger this)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Small delay to detect if it was a screenshot
        setTimeout(() => {
          if (!document.hidden) {
            // Quick switch might indicate screenshot
            handleScreenshot();
          }
        }, 100);
      }
    };

    // Method 3: Detect window blur (screenshot tools often steal focus)
    const handleBlur = () => {
      // Check if any screenshot keys were recently pressed
      const timeSinceLastKey = Date.now() - lastKeyTime.current;
      if (timeSinceLastKey < 500) {
        handleScreenshot();
      }
    };

    // Method 4: Prevent context menu on images (right-click save)
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('.message-bubble')) {
        // Allow menu but could log this
        console.log('[Privacy] Right-click on message detected');
      }
    };

    // Method 5: Detect DevTools open (some users take screenshots via DevTools)
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        console.log('[Privacy] DevTools detected - screenshot possible');
      }
    };

    // Add all event listeners
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('resize', detectDevTools);

    // Prevent drag-and-drop of images (another screenshot method)
    document.addEventListener('dragstart', (e) => {
      if ((e.target as HTMLElement).tagName === 'IMG') {
        e.preventDefault();
      }
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize', detectDevTools);
    };
  }, [handleScreenshot, enabled]);
}

export default useScreenshotDetection;
