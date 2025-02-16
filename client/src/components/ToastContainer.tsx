import React from 'react';
import Toast from './Toast';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

const TOAST_LIMIT = 5;
const DEFAULT_DURATION = 5000;

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  // Only show the most recent toasts up to the limit
  const visibleToasts = toasts.slice(0, TOAST_LIMIT);

  const getContainerPosition = (index: number) => {
    const baseStyles = 'transform-gpu transition-all duration-300 ease-out';
    const offset = index * 4; // 16px gap between toasts
    return `${baseStyles} translate-y-[${offset}rem]`;
  };

  return (
    <div 
      id="toast-container"
      aria-live="assertive" 
      className="
        fixed inset-0 z-50 flex flex-col items-end px-4 py-6 
        pointer-events-none sm:items-end gap-3 max-h-screen
        overflow-hidden
      "
      style={{
        // Ensure toasts are properly layered
        '--stacking-offset': visibleToasts.length
      } as React.CSSProperties}
    >
      <div className="flex flex-col items-end space-y-4 w-full max-w-sm ml-auto">
        {visibleToasts.map((toast, index) => (
          <div
            key={toast.id}
            className={getContainerPosition(index)}
            style={{
              zIndex: visibleToasts.length - index
            }}
          >
          <Toast
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration || DEFAULT_DURATION}
            onRemove={onRemove}
          />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;