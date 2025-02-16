import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
  variant?: 'default' | 'dots' | 'bars';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'text-blue-500',
  className = '',
  variant = 'default'
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const renderDefault = () => (
    <svg
      className={`${sizeMap[size]} ${color} animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const renderDots = () => (
    <div className={`flex space-x-1 ${className}`}>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={`${sizeMap[size].split(' ')[0].replace('w-', 'w-2')} 
                     aspect-square rounded-full ${color}
                     animate-pulse`}
          style={{
            animationDelay: `${i * 150}ms`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );

  const renderBars = () => (
    <div className={`flex items-end space-x-1 ${className}`}>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={`${sizeMap[size].split(' ')[0].replace('w-', 'w-1')} ${color}
                     animate-pulse transform origin-bottom`}
          style={{
            height: `${(i + 1) * 33.33}%`,
            animationDelay: `${i * 150}ms`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'bars':
        return renderBars();
      default:
        return renderDefault();
    }
  };

  return (
    <div role="status" className="inline-flex items-center justify-center">
      {renderSpinner()}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;