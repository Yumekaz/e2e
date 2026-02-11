import React, { useEffect, useState } from 'react';
import type { ToastProps } from '../types';

interface ToastItem {
  id: string;
  message: string;
  type: ToastProps['type'];
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

function ToastIcon({ type }: { type: ToastProps['type'] }): JSX.Element {
  switch (type) {
    case 'success':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'error':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'warning':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'info':
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
}

function ToastItemComponent({ 
  toast, 
  onRemove 
}: { 
  toast: ToastItem; 
  onRemove: (id: string) => void;
}): JSX.Element {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const handleClick = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div 
      className={`toast toast-${toast.type} ${isExiting ? 'toast-exit' : ''}`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <span className="toast-icon">
        <ToastIcon type={toast.type} />
      </span>
      <span className="toast-message">{toast.message}</span>
    </div>
  );
}

// Single toast for backwards compatibility
function Toast({ message, type }: ToastProps): JSX.Element {
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">
        <ToastIcon type={type} />
      </span>
      <span className="toast-message">{message}</span>
    </div>
  );
}

// Toast container for multiple toasts
export function ToastContainer({ toasts, onRemove }: ToastContainerProps): JSX.Element {
  if (toasts.length === 0) return <></>;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItemComponent 
          key={toast.id} 
          toast={toast} 
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

export default Toast;
