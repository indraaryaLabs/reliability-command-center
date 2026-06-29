import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtext: string;
  icon: LucideIcon;
  color: 'emerald' | 'rose' | 'amber' | 'blue' | 'zinc';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  subtext,
  icon: Icon,
  color,
  trend,
}) => {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50/40 dark:bg-emerald-500/5',
      border: 'border-emerald-200 dark:border-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      glow: 'shadow-emerald-100 dark:shadow-emerald-500/5',
    },
    rose: {
      bg: 'bg-rose-50/40 dark:bg-rose-500/5',
      border: 'border-rose-200 dark:border-rose-500/20',
      text: 'text-rose-600 dark:text-rose-400',
      glow: 'shadow-rose-100 dark:shadow-rose-500/5',
    },
    amber: {
      bg: 'bg-amber-50/40 dark:bg-amber-500/5',
      border: 'border-amber-200 dark:border-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      glow: 'shadow-amber-100 dark:shadow-amber-500/5',
    },
    blue: {
      bg: 'bg-blue-50/40 dark:bg-blue-500/5',
      border: 'border-blue-200 dark:border-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      glow: 'shadow-blue-100 dark:shadow-blue-500/5',
    },
    zinc: {
      bg: 'bg-slate-50/50 dark:bg-zinc-500/5',
      border: 'border-slate-200 dark:border-zinc-500/20',
      text: 'text-slate-600 dark:text-zinc-400',
      glow: 'shadow-slate-100 dark:shadow-zinc-500/5',
    },
  };

  const currentColors = colorMap[color] || colorMap.zinc;

  return (
    <div
      id={id}
      className={`relative overflow-hidden rounded-xl border ${currentColors.border} ${currentColors.bg} p-5 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${currentColors.glow} bg-white dark:bg-neutral-900/60 backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-slate-500 dark:text-neutral-400 uppercase">
          {title}
        </span>
        <div className={`rounded-lg p-2 ${currentColors.text} bg-slate-100 dark:bg-neutral-950/40 border border-slate-200 dark:border-neutral-800/60`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-semibold tracking-tight text-slate-900 dark:text-neutral-50 text-glow-sm">
          {value}
        </span>
        {trend && (
          <span
            className={`font-mono text-xs font-medium ${
              trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-slate-400 dark:text-neutral-500">{subtext}</span>
        <div className="flex gap-0.5">
          <span className={`h-1 w-1 rounded-full ${currentColors.text} opacity-40 animate-pulse`} />
          <span className={`h-1 w-1 rounded-full ${currentColors.text} opacity-60 animate-pulse [animation-delay:0.2s]`} />
          <span className={`h-1 w-1 rounded-full ${currentColors.text} opacity-80 animate-pulse [animation-delay:0.4s]`} />
        </div>
      </div>
    </div>
  );
};
