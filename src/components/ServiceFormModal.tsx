import React, { useState, useEffect } from 'react';
import { MonitoredService, ServiceCategory } from '../types';
import { X, Globe, Save } from 'lucide-react';

interface ServiceFormModalProps {
  id?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (serviceData: Partial<MonitoredService>) => void;
  service?: MonitoredService | null;
}

export const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  id,
  isOpen,
  onClose,
  onSave,
  service,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState<number | ''>('');
  const [category, setCategory] = useState<ServiceCategory>('web');
  const [interval, setInterval] = useState<number>(60);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

    // load service data if editing
  useEffect(() => {
    if (service) {
      setName(service.name);
      setUrl(service.url);
      setIpAddress(service.ipAddress);
      setPort(service.port !== undefined ? service.port : '');
      setCategory(service.category);
      setInterval(service.interval);
      setDescription(service.description);
    } else {
      setName('');
      setUrl('');
      setIpAddress('');
      setPort('');
      setCategory('web');
      setInterval(60);
      setDescription('');
    }
    setError('');
  }, [service, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Service name is required');
      return;
    }
    if (!url.trim()) {
      setError('Service endpoint URL is required');
      return;
    }
    if (!ipAddress.trim()) {
      setError('IP address or target host is required');
      return;
    }

    // basic host/IP check
    const ipRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$|^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
    if (!ipRegex.test(ipAddress)) {
      setError('Please provide a valid IP address or hostname format');
      return;
    }

    if (interval < 10) {
      setError('Minimum poll interval is 10 seconds');
      return;
    }

    onSave({
      name,
      url,
      ipAddress,
      port: port !== '' ? Number(port) : undefined,
      category,
      interval,
      description,
    });
    
    onClose();
  };

  return (
    <div
      id={id}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-neutral-950/70 backdrop-blur-md"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-2xl animate-in fade-in zoom-in-95 duration-250">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <h3 className="font-sans text-base font-semibold text-slate-800 dark:text-neutral-100">
              {service ? 'Edit Monitored Spec' : 'Add Monitored Inventory'}
            </h3>
          </div>
          <button
            id="btn-close-modal"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 font-mono text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] text-slate-450 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                Service Name *
              </label>
              <input
                id="input-service-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Core REST Gateway"
                className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 dark:border-neutral-800 dark:bg-neutral-950 px-3 font-sans text-sm text-slate-700 dark:text-neutral-200 placeholder-slate-450 dark:placeholder-neutral-600 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-neutral-950 focus:outline-none transition-colors duration-200"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-mono text-[10px] text-slate-450 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <select
                  id="select-service-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 dark:border-neutral-800 dark:bg-neutral-950 px-3 font-sans text-sm text-slate-700 dark:text-neutral-200 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-neutral-950 focus:outline-none transition-colors duration-200"
                >
                  <option value="web">Web Interface</option>
                  <option value="api">REST / RPC API</option>
                  <option value="database">Database Link</option>
                  <option value="auth">Auth Gateway</option>
                  <option value="cache">In-Memory Cache</option>
                  <option value="infra">Cloud Infra</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-slate-450 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                  Poll Interval *
                </label>
                <div className="relative">
                  <input
                    id="input-service-interval"
                    type="number"
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                    min="10"
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 dark:border-neutral-800 dark:bg-neutral-950 pl-3 pr-10 font-sans text-sm text-slate-700 dark:text-neutral-200 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-neutral-950 focus:outline-none transition-colors duration-200"
                  />
                  <span className="absolute right-3 top-2.5 font-mono text-[10px] text-slate-400 dark:text-neutral-500">SEC</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block font-mono text-[10px] text-slate-450 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                Endpoint URL / URI Link *
              </label>
              <input
                id="input-service-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. https://api.production.corp/v1"
                className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 dark:border-neutral-800 dark:bg-neutral-950 px-3 font-sans text-sm text-slate-700 dark:text-neutral-200 placeholder-slate-450 dark:placeholder-neutral-600 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-neutral-950 focus:outline-none transition-colors duration-200"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-mono text-[10px] text-slate-450 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                  Host IP / Address *
                </label>
                <input
                  id="input-service-ip"
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="e.g. 10.0.12.5 or node-a.corp"
                  className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 dark:border-neutral-800 dark:bg-neutral-950 px-3 font-sans text-sm text-slate-700 dark:text-neutral-200 placeholder-slate-450 dark:placeholder-neutral-600 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-neutral-950 focus:outline-none transition-colors duration-200"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-slate-450 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                  Port Number
                </label>
                <input
                  id="input-service-port"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder="e.g. 443"
                  className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 dark:border-neutral-800 dark:bg-neutral-950 px-3 font-sans text-sm text-slate-700 dark:text-neutral-200 placeholder-slate-450 dark:placeholder-neutral-600 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-neutral-950 focus:outline-none transition-colors duration-200"
                />
              </div>
            </div>
            <div>
              <label className="block font-mono text-[10px] text-slate-450 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                Service Description Spec
              </label>
              <textarea
                id="input-service-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a brief functional description of this system component..."
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-neutral-800 dark:bg-neutral-950 p-3 font-sans text-sm text-slate-700 dark:text-neutral-200 placeholder-slate-450 dark:placeholder-neutral-600 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-neutral-950 focus:outline-none resize-none transition-colors duration-200"
              />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-neutral-800 pt-5">
            <button
              id="btn-modal-cancel"
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-sans text-xs font-semibold text-slate-500 transition hover:border-slate-350 hover:bg-slate-50 hover:text-slate-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-modal-submit"
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-sans text-xs font-semibold text-white transition hover:bg-indigo-500 cursor-pointer shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              Save Inventory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
