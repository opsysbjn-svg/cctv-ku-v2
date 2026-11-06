import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'active' | 'pending';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'text-slate-900 dark:text-slate-100',
    active: 'text-emerald-600 dark:text-emerald-400',
    pending: 'text-slate-400 dark:text-slate-500',
  };

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-blue-600 dark:text-cyan-400">
          {icon}
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-2xl font-bold font-mono tracking-tight ${variantStyles[variant]}`}>
          {value}
        </span>
      </div>
      {subtext && (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
};
