import React, { useState, useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal, Shield, RefreshCw, Trash2, Search, Filter, Clipboard, Check, Download } from 'lucide-react';

interface LogTerminalProps {
  id?: string;
  logs: LogEntry[];
  onClearLogs: () => void;
  onRefreshLogs?: () => void;
}

export const LogTerminal: React.FC<LogTerminalProps> = ({
  id,
  logs,
  onClearLogs,
  onRefreshLogs,
}) => {
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalBodyRef = useRef<HTMLDivElement>(null);

  // Filter logs based on search query & level
  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.serviceName && log.serviceName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesLevel && matchesSearch;
  });

  // Handle auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleCopyLogs = () => {
    const logText = filteredLogs
      .map((log) => `[${log.timestamp}] [${log.level}] ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const logText = filteredLogs
      .map((log) => `[${log.timestamp}] [${log.level}] ${log.message}`)
      .join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reliability_command_center_logs_${new Date()
      .toISOString()
      .split('T')[0]}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id={id}
      className="flex flex-col rounded-xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 p-4 shadow-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-slate-300 dark:text-neutral-600">|</span>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-neutral-400">
            <Terminal className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            <span className="font-semibold tracking-wider uppercase">SERVICE_HEARTBEAT_SHELL</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 flex items-center gap-1 font-mono text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-pulse" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            LIVE STREAMING
          </span>
          <div className="relative">
            <Search className="absolute top-2 left-2.5 h-3 w-3 text-slate-450 dark:text-neutral-500" />
            <input
              id="terminal-search-input"
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-44 rounded-md border border-slate-200 bg-slate-50 pl-8 pr-2.5 font-mono text-[10px] text-slate-700 placeholder-slate-400 focus:border-indigo-500/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder-neutral-600"
            />
          </div>
          <button
            id="btn-copy-terminal"
            onClick={handleCopyLogs}
            title="Copy logs to clipboard"
            className="flex h-7 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 font-sans text-[10px] font-semibold text-slate-500 hover:bg-slate-50 transition hover:border-slate-300 hover:text-slate-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Clipboard className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
          <button
            id="btn-download-terminal"
            onClick={handleDownloadLogs}
            title="Export standard log file"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 transition hover:border-slate-300 hover:text-slate-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <Download className="h-3 w-3" />
          </button>
          <button
            id="btn-clear-terminal"
            onClick={onClearLogs}
            title="Flush terminal output"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:border-rose-500/20 dark:hover:bg-rose-500/5 dark:hover:text-rose-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-neutral-900 pb-2.5">
        <div className="flex gap-1.5">
          {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((level) => {
            const activeColors = {
              ALL: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200',
              INFO: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-400',
              WARN: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-400',
              ERROR: 'border-rose-300 bg-rose-50 text-rose-750 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-400',
            }[level];

            const inactiveColors = {
              ALL: 'border-slate-100 text-slate-450 hover:text-slate-700 hover:border-slate-300 dark:border-neutral-800/40 dark:text-neutral-500 dark:hover:text-neutral-300 dark:hover:border-neutral-700',
              INFO: 'border-slate-100 text-slate-450 hover:text-emerald-600 hover:border-emerald-200 dark:border-neutral-800/40 dark:text-neutral-500 dark:hover:text-emerald-400 dark:hover:border-emerald-500/20',
              WARN: 'border-slate-100 text-slate-450 hover:text-amber-600 hover:border-amber-200 dark:border-neutral-800/40 dark:text-neutral-500 dark:hover:text-amber-400 dark:hover:border-amber-500/20',
              ERROR: 'border-slate-100 text-slate-450 hover:text-rose-600 hover:border-rose-200 dark:border-neutral-800/40 dark:text-neutral-500 dark:hover:text-rose-400 dark:hover:border-rose-500/20',
            }[level];

            return (
              <button
                key={level}
                id={`btn-filter-level-${level}`}
                onClick={() => setFilterLevel(level)}
                className={`rounded px-2 py-0.5 font-mono text-[9px] font-semibold border transition ${
                  filterLevel === level ? activeColors : inactiveColors
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-1.5 font-mono text-[9px] text-slate-400 dark:text-neutral-500 cursor-pointer select-none">
          <input
            id="checkbox-autoscroll"
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded border-slate-200 bg-white text-indigo-500 focus:ring-0 cursor-pointer dark:border-neutral-800 dark:bg-neutral-900"
          />
          AUTO_SCROLL_SINK
        </label>
      </div>
      <div
        ref={terminalBodyRef}
        className="dark-scrollbar mt-3 h-52 overflow-y-auto rounded-lg bg-neutral-950 p-3 border border-neutral-900/60 font-mono text-[11px] leading-relaxed text-neutral-300"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-neutral-600 tracking-wider">
            NO HEARTBEAT LOGS MATCHING CRITERIA
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => {
              const levelColors = {
                INFO: 'text-neutral-500',
                WARN: 'text-amber-500 font-semibold',
                ERROR: 'text-rose-500 font-semibold animate-pulse',
              }[log.level];

              const msgColors = {
                INFO: 'text-neutral-300',
                WARN: 'text-amber-300/90',
                ERROR: 'text-rose-300/95',
              }[log.level];

              return (
                <div key={log.id} className="hover:bg-neutral-900/40 px-1 py-0.5 rounded transition">
                  <span className="text-indigo-400 select-none">[{log.timestamp}]</span>{' '}
                  <span className={`select-none font-semibold ${levelColors}`}>
                    [{log.level}]
                  </span>{' '}
                  {log.serviceName && (
                    <span className="text-sky-400 select-none">
                      [{log.serviceName.replace(/\s+/g, '-').toLowerCase()}]
                    </span>
                  )}{' '}
                  <span className={msgColors}>{log.message}</span>
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
