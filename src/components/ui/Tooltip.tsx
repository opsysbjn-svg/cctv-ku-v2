import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'right' | 'top' | 'bottom';
  enabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'right',
  enabled = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!enabled || !content) {
    return <>{children}</>;
  }

  const positionClasses = {
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  };

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-50 ${positionClasses[position]} px-2.5 py-1 text-xs font-medium text-white bg-slate-900 border border-slate-700 rounded-md shadow-md whitespace-nowrap pointer-events-none transition-opacity duration-150 animate-in fade-in`}
        >
          {content}
        </div>
      )}
    </div>
  );
};
