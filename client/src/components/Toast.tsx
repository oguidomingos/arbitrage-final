import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onRemove: (id: string) => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  onRemove,
  duration = 5000
}) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(id);
    }, 300); // Match animation duration
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isExiting) {
        handleRemove();
      }
    }, duration - 300); // Subtract animation duration

    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  const getIcon = () => {
    const iconProps = {
      className: 'w-5 h-5 shrink-0',
      'aria-hidden': true
    };

    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} />;
      case 'error':
        return <AlertCircle {...iconProps} />;
      case 'warning':
        return <AlertTriangle {...iconProps} />;
      case 'info':
        return <Info {...iconProps} />;
    }
  };

  const getStyles = () => {
    const baseStyles = `
      group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden
      rounded-lg border p-3 shadow-lg transition-all duration-300
      ${isExiting ? 'toast-slide-out' : 'toast-slide-in animate-toast-enter'}`;

    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-500/10 border-green-500/20 text-green-400`;
      case 'error':
        return `${baseStyles} bg-red-500/10 border-red-500/20 text-red-400`;
      case 'warning':
        return `${baseStyles} bg-yellow-500/10 border-yellow-500/20 text-yellow-400`;
      case 'info':
        return `${baseStyles} bg-blue-500/10 border-blue-500/20 text-blue-400`;
    }
  };

  const getProgressStyles = () => {
    const baseStyles = `
      absolute bottom-0 left-0 h-1 w-full origin-left
      animate-progress-bar
      duration-${duration}`;

    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-500/20`;
      case 'error':
        return `${baseStyles} bg-red-500/20`;
      case 'warning':
        return `${baseStyles} bg-yellow-500/20`;
      case 'info':
        return `${baseStyles} bg-blue-500/20`;
    }
  };

  return (
    <div 
      className={getStyles()}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 w-0 flex-1">
        {getIcon()}
        <div className="w-full">
          <div className="font-semibold">
            {title}
          </div>
          <div className="mt-1 text-sm text-gray-300 line-clamp-2">
            {message}
          </div>
        </div>
      </div>
      
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => handleRemove()}
          className={`
            rounded-lg p-1.5 hover:bg-white/10
            transition-colors duration-200
          `}
        >
          <X className="w-4 h-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div 
        className={getProgressStyles()}
        style={{ 
          animationDuration: `${duration}ms`,
        }} 
      />
    </div>
  );
};

export default Toast;