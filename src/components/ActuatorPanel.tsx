import React from 'react';
import { ActuatorMetrics } from '../types';
import {
  Activity,
  Cpu,
  Database,
  HardDrive,
  Heart,
  RefreshCw,
  Server,
  Terminal,
  AlertTriangle,
  Flame,
} from 'lucide-react';

interface ActuatorPanelProps {
  id?: string;
  metrics: ActuatorMetrics;
  onSimulateCpuSpike: () => void;
  onSimulateDbDisruption: () => void;
  onTriggerGc: () => void;
  onResetMetrics: () => void;
  isCpuSpikeActive: boolean;
  isDbDisrupted: boolean;
}

export const ActuatorPanel: React.FC<ActuatorPanelProps> = ({
  id,
  metrics,
  onSimulateCpuSpike,
  onSimulateDbDisruption,
  onTriggerGc,
  onResetMetrics,
  isCpuSpikeActive,
  isDbDisrupted,
}) => {
  // Format uptime to standard DD:HH:MM:SS
  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    return [
      d > 0 ? `${d}d` : '',
      `${String(h).padStart(2, '0')}h`,
      `${String(m).padStart(2, '0')}m`,
      `${String(s).padStart(2, '0')}s`,
    ]
      .filter(Boolean)
      .join(' : ');
  };

  const heapPct = (metrics.heapUsed / metrics.heapMax) * 100;
  const diskPct = ((metrics.diskTotal - metrics.diskFree) / metrics.diskTotal) * 100;
  const dbPoolPct = (metrics.dbPoolActive / metrics.dbPoolMax) * 100;

  return (
    <div
      id={id}
      className="rounded-xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/40 p-5 shadow-sm backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-slate-100 dark:bg-neutral-950/80 p-1.5 text-indigo-600 dark:text-indigo-400 border border-slate-200/50 dark:border-neutral-800">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-sans text-sm font-semibold text-slate-800 dark:text-neutral-100 tracking-tight">
              Self-Observability Hub
            </h4>
            <span className="font-mono text-[9px] text-slate-400 dark:text-neutral-500 tracking-widest uppercase">
              Spring Boot Actuator Mock Endpoint
            </span>
          </div>
        </div>
        <div>
          {metrics.healthStatus === 'UP' && (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <Heart className="h-3 w-3 animate-pulse text-emerald-550 dark:text-emerald-400" />
              SYSTEM_OK
            </span>
          )}
          {metrics.healthStatus === 'DEGRADED' && (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/15 bg-amber-500/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
              <AlertTriangle className="h-3 w-3 text-amber-500 dark:text-amber-400" />
              DEGRADED
            </span>
          )}
          {metrics.healthStatus === 'DOWN' && (
            <span className="flex items-center gap-1.5 rounded-full border border-rose-500/15 bg-rose-500/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-rose-600 dark:text-rose-400 animate-pulse">
              <Flame className="h-3 w-3 text-rose-500 dark:text-rose-400" />
              SYSTEM_FAIL
            </span>
          )}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 dark:border-neutral-950 dark:bg-neutral-950/30 p-3">
          <span className="block font-mono text-[9px] text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
            MONITOR_UPTIME
          </span>
          <span className="mt-1 block font-mono text-sm font-semibold text-slate-800 dark:text-neutral-100 truncate">
            {formatUptime(metrics.uptime)}
          </span>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 dark:border-neutral-950 dark:bg-neutral-950/30 p-3">
          <span className="block font-mono text-[9px] text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
            JVM_THREADS
          </span>
          <span className="mt-1 block font-mono text-sm font-semibold text-slate-800 dark:text-neutral-100">
            {metrics.threadCount} <span className="text-[10px] text-slate-400 dark:text-neutral-600">Active</span>
          </span>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 dark:border-neutral-950 dark:bg-neutral-950/30 p-3">
          <span className="block font-mono text-[9px] text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
            ACTUATOR_HEALTH
          </span>
          <span className="mt-1 block font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
            HTTP_200 / GET
          </span>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 dark:border-neutral-950 dark:bg-neutral-950/30 p-3">
          <span className="block font-mono text-[9px] text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
            DB_POOL_SINK
          </span>
          <span className="mt-1 block font-mono text-sm font-semibold text-slate-800 dark:text-neutral-100">
            {metrics.dbPoolActive} / {metrics.dbPoolMax}
          </span>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between font-mono text-xs text-slate-500 dark:text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-slate-400 dark:text-neutral-500" />
                <span>CPU UTILIZATION</span>
              </div>
              <span className={metrics.cpuUsage > 85 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-700 dark:text-neutral-200'}>
                {metrics.cpuUsage.toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  metrics.cpuUsage > 85
                    ? 'bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                    : 'bg-indigo-600 dark:bg-indigo-500'
                }`}
                style={{ width: `${metrics.cpuUsage}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between font-mono text-xs text-slate-500 dark:text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-slate-400 dark:text-neutral-500" />
                <span>JVM HEAP MEMORY</span>
              </div>
              <span className="text-slate-700 dark:text-neutral-200">
                {metrics.heapUsed}MB / {metrics.heapMax}MB
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
              <div
                className={`h-full rounded-full bg-emerald-500 transition-all duration-500`}
                style={{ width: `${heapPct}%` }}
              />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between font-mono text-xs text-slate-500 dark:text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-slate-400 dark:text-neutral-500" />
                <span>HIKARICP DB POOL</span>
              </div>
              <span className={isDbDisrupted ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-700 dark:text-neutral-200'}>
                {metrics.dbPoolActive} Active / {metrics.dbPoolMax} Max
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isDbDisrupted
                    ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                    : 'bg-teal-500'
                }`}
                style={{ width: `${dbPoolPct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between font-mono text-xs text-slate-500 dark:text-neutral-400">
              <div className="flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-slate-400 dark:text-neutral-500" />
                <span>DISK SPACE UTILIZATION</span>
              </div>
              <span className="text-slate-700 dark:text-neutral-200">
                {(metrics.diskTotal - metrics.diskFree).toFixed(1)}GB / {metrics.diskTotal}GB
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
              <div
                className="h-full rounded-full bg-pink-500 transition-all duration-500"
                style={{ width: `${diskPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 border-t border-slate-200 dark:border-neutral-800 pt-4">
        <span className="block font-mono text-[9px] text-slate-450 dark:text-neutral-500 uppercase tracking-widest">
          SIMULATOR INTERVENTION COMMANDS
        </span>
        
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            id="btn-trigger-cpu-spike"
            onClick={onSimulateCpuSpike}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-sans text-xs font-semibold transition-all duration-200 ${
              isCpuSpikeActive
                ? 'border-amber-500/30 bg-amber-500/5 text-amber-650 dark:text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.05)]'
                : 'border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950/60 text-slate-600 dark:text-neutral-400 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-900 hover:text-slate-800 dark:hover:text-neutral-200'
            }`}
          >
            <Activity className={`h-3.5 w-3.5 ${isCpuSpikeActive ? 'animate-pulse text-amber-500 dark:text-amber-400' : ''}`} />
            {isCpuSpikeActive ? 'Cool Down CPU Load' : 'Spike CPU Load (92%)'}
          </button>
          <button
            id="btn-trigger-db-disrupt"
            onClick={onSimulateDbDisruption}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-sans text-xs font-semibold transition-all duration-200 ${
              isDbDisrupted
                ? 'border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.05)]'
                : 'border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950/60 text-slate-600 dark:text-neutral-400 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-900 hover:text-slate-800 dark:hover:text-neutral-200'
            }`}
          >
            <Database className={`h-3.5 w-3.5 ${isDbDisrupted ? 'text-rose-500 dark:text-rose-400 animate-bounce' : ''}`} />
            {isDbDisrupted ? 'Restore Hikari CP' : 'Disrupt Database Link'}
          </button>
          <button
            id="btn-trigger-gc"
            onClick={onTriggerGc}
            title="Forces system.gc() simulation to clear memory cache"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950/60 px-3 py-1.5 font-sans text-xs font-semibold text-slate-600 dark:text-neutral-400 transition-all duration-200 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-900 hover:text-slate-800 dark:hover:text-neutral-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Trigger JVM system.gc()
          </button>
          {(isCpuSpikeActive || isDbDisrupted) && (
            <button
              id="btn-reset-metrics"
              onClick={onResetMetrics}
              className="ml-auto rounded-lg border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 px-3 py-1.5 font-sans text-xs font-semibold text-slate-700 dark:text-neutral-300 transition-all hover:bg-slate-50 dark:hover:bg-neutral-900 hover:text-slate-900 dark:hover:text-white"
            >
              Clear Interventions
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
