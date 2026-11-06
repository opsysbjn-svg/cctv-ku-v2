import React from 'react';

interface BadgeProps {
  status: 'online' | 'offline' | 'warning' | 'idle';
  label?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, label, size = 'md' }) => {
  const configs = {
    online: {
      dot: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
      defaultLabel: 'Online',
    },
    offline: {
      dot: 'bg-slate-400 dark:bg-slate-500',
      text: 'text-slate-600 dark:text-slate-400',
      defaultLabel: 'Offline',
    },
    warning: {
      dot: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-400',
      defaultLabel: 'Peringatan',
    },
    idle: {
      dot: 'bg-cyan-500',
      text: 'text-cyan-700 dark:text-cyan-400',
      defaultLabel: 'Siap',
    },
  };

  const current = configs[status];
  const displayLabel = label || current.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ${
        size === 'sm' ? 'text-xs' : 'text-xs md:text-sm'
      } ${current.text}`}
    >
      <span className={`w-2 h-2 rounded-full ${current.dot} shrink-0`} />
      <span>{displayLabel}</span>
    </span>
  );
};
