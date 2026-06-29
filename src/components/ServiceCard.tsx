import React from 'react';
import { MonitoredService } from '../types';
import { ServiceChart } from './ServiceChart';
import {
  Globe,
  Network,
  Database,
  Key,
  Zap,
  Cloud,
  RotateCw,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowRight,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface ServiceCardProps {
  id?: string;
  service: MonitoredService;
  onForceRecheck: (id: string) => void;
  onEdit: (service: MonitoredService) => void;
  onDelete: (id: string) => void;
  onSelect: (service: MonitoredService) => void;
  isRechecking: boolean;
  isSelected: boolean;
}

const CATEGORY_META = {
  web: { label: 'Web UI', icon: Globe, color: 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/10 bg-indigo-50/50 dark:bg-indigo-500/5' },
  api: { label: 'REST API', icon: Network, color: 'text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/10 bg-sky-50/50 dark:bg-sky-500/5' },
  database: { label: 'Database', icon: Database, color: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/10 bg-emerald-50/50 dark:bg-emerald-500/5' },
  auth: { label: 'Auth Gateway', icon: Key, color: 'text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/10 bg-violet-50/50 dark:bg-violet-500/5' },
  cache: { label: 'In-Memory', icon: Zap, color: 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/10 bg-amber-50/50 dark:bg-amber-500/5' },
  infra: { label: 'Cloud Infra', icon: Cloud, color: 'text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-500/10 bg-pink-50/50 dark:bg-pink-500/5' },
};

export const ServiceCard: React.FC<ServiceCardProps> = ({
  id,
  service,
  onForceRecheck,
  onEdit,
  onDelete,
  onSelect,
  isRechecking,
  isSelected,
}) => {
  const meta = CATEGORY_META[service.category] || CATEGORY_META.web;
  const CategoryIcon = meta.icon;

  const isUp = service.status === 'UP';

  return (
    <div
      id={id}
      onClick={() => onSelect(service)}
      className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'border-slate-500 bg-white dark:border-neutral-500 dark:bg-neutral-900/90 shadow-[0_0_15px_rgba(0,0,0,0.03)] dark:shadow-[0_0_15px_rgba(255,255,255,0.03)] scale-[1.01] ring-1 ring-slate-400 dark:ring-0'
          : 'border-slate-200 bg-slate-50/50 dark:border-neutral-800 dark:bg-neutral-900/40 hover:border-slate-300 hover:bg-white dark:hover:border-neutral-700 dark:hover:bg-neutral-900/70 hover:scale-[1.01]'
      }`}
    >
      {isUp ? (
        <div className="absolute top-0 right-10 -z-10 h-16 w-16 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
      ) : (
        <div className="absolute top-0 right-10 -z-10 h-16 w-16 rounded-full bg-rose-500/10 blur-2xl group-hover:bg-rose-500/20 transition-colors animate-pulse" />
      )}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg border p-2 ${meta.color}`}>
              <CategoryIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-sans text-sm font-semibold tracking-tight text-slate-900 dark:text-neutral-100 dark:group-hover:text-white transition-colors">
                {service.name}
              </h3>
              <span className="font-mono text-[10px] text-slate-500 dark:text-neutral-500 uppercase tracking-wider">
                {meta.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isUp ? (
              <span className="flex h-5 items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-pulse-ring" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                </span>
                UP
              </span>
            ) : (
              <span className="flex h-5 items-center gap-1.5 rounded-full border border-rose-500/15 bg-rose-500/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-rose-600 dark:text-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.1)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-rose-450 dark:bg-rose-400 opacity-75 animate-pulse-ring [animation-duration:1s]" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                </span>
                DOWN
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-slate-500 dark:text-neutral-400">
          <span className="text-slate-700 dark:text-neutral-300 truncate max-w-[190px]" title={service.url}>
            {service.url.replace('https://', '').replace('postgresql://', '').replace('redis://', '')}
          </span>
          <span className="text-slate-300 dark:text-neutral-600">•</span>
          <span className="text-slate-500">
            {service.ipAddress}
            {service.port ? `:${service.port}` : ''}
          </span>
        </div>

        <p className="mt-2.5 line-clamp-2 text-xs text-slate-500 dark:text-neutral-500 leading-relaxed min-h-[32px]">
          {service.description}
        </p>
      </div>
      <div className="mt-5 border-t border-slate-200 dark:border-neutral-800/60 pt-4">
        <div className="flex items-end justify-between">
          <div>
            <span className="block font-mono text-[9px] text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
              LATENCY TREND
            </span>
            <span className="font-mono text-lg font-semibold text-slate-800 dark:text-neutral-100">
              {isUp ? `${service.latency} ms` : 'TIMEOUT'}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-mono text-[9px] text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
              24H UPTIME
            </span>
            <span className="font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {service.uptime24h.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="mt-3.5 h-10 w-full overflow-hidden rounded-md bg-slate-100/50 dark:bg-neutral-950/20 border border-slate-200/50 dark:border-neutral-950/40">
          <ServiceChart history={service.history} status={service.status} height={40} width={220} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 dark:border-neutral-800/30 pt-3">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 dark:text-neutral-500">
          <span className="font-medium text-slate-500 dark:text-neutral-400">POLL:</span>
          <span>{service.interval}s</span>
          <span className="text-slate-300 dark:text-neutral-700">•</span>
          <span>Checked: {service.lastChecked}</span>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            id={`btn-recheck-${service.id}`}
            onClick={() => onForceRecheck(service.id)}
            disabled={isRechecking}
            title="Force Synchronous Healthcheck"
            className="rounded-md border border-slate-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-950/40 p-1.5 text-slate-500 dark:text-neutral-400 transition-all hover:border-slate-300 hover:bg-slate-100 dark:hover:border-neutral-700 dark:hover:bg-neutral-900 hover:text-slate-700 dark:hover:text-neutral-200 disabled:opacity-50"
          >
            <RotateCw className={`h-3 w-3 ${isRechecking ? 'animate-spin text-emerald-500 dark:text-emerald-400' : ''}`} />
          </button>
          <button
            id={`btn-edit-${service.id}`}
            onClick={() => onEdit(service)}
            title="Edit Inventory Spec"
            className="rounded-md border border-slate-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-950/40 p-1.5 text-slate-500 dark:text-neutral-400 transition-all hover:border-slate-300 hover:bg-slate-100 dark:hover:border-neutral-700 dark:hover:bg-neutral-900 hover:text-slate-700 dark:hover:text-neutral-200"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            id={`btn-delete-${service.id}`}
            onClick={() => onDelete(service.id)}
            title="Delete Service Spec"
            className="rounded-md border border-slate-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-950/40 p-1.5 text-slate-550 dark:text-neutral-500 transition-all hover:border-rose-300 hover:bg-rose-50 dark:hover:border-rose-500/20 dark:hover:bg-rose-500/5 hover:text-rose-600 dark:hover:text-rose-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <button
            id={`btn-details-${service.id}`}
            onClick={() => onSelect(service)}
            title="Show Detailed Charts & Ping logs"
            className="ml-1 flex items-center gap-0.5 rounded-md border border-slate-200 dark:border-neutral-800 bg-slate-900 dark:bg-neutral-50 p-1.5 text-xs font-medium text-white dark:text-neutral-950 transition-all hover:bg-slate-800 dark:hover:bg-neutral-200"
          >
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
