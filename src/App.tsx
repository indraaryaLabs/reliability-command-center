import { useState, useEffect, useMemo, useRef } from 'react';
import { MonitoredService, ServiceCategory, ServiceStatus, LogEntry, ActuatorMetrics, LatencyPoint } from './types';
import { INITIAL_SERVICES } from './data/mockServices';
import { makeLog, getInitialLogs } from './data/logHelper';
import { MetricCard } from './components/MetricCard';
import { ServiceCard } from './components/ServiceCard';
import { ActuatorPanel } from './components/ActuatorPanel';
import { LogTerminal } from './components/LogTerminal';
import { ServiceFormModal } from './components/ServiceFormModal';
import { ServiceChart } from './components/ServiceChart';
import {
  Activity,
  Plus,
  Search,
  CheckCircle,
  AlertOctagon,
  Clock,
  LayoutGrid,
  TrendingUp,
  Sliders,
  Play,
  Pause,
  RefreshCw,
  X,
  Radio,
  Wifi,
  WifiOff,
  Sun,
  Moon,
} from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);


  const [isLiveMode, setIsLiveMode] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [services, setServices] = useState<MonitoredService[]>(INITIAL_SERVICES);
  const [logs, setLogs] = useState<LogEntry[]>(getInitialLogs());
  const [selectedService, setSelectedService] = useState<MonitoredService | null>(INITIAL_SERVICES[0]);
  

  const [isSimulating, setIsSimulating] = useState(true);
  const [recheckingIds, setRecheckingIds] = useState<Record<string, boolean>>({});
  const [isGlobalRechecking, setIsGlobalRechecking] = useState(false);
  

  const [actuator, setActuator] = useState<ActuatorMetrics>({
    uptime: 12480,
    cpuUsage: 14.5,
    heapUsed: 245,
    heapMax: 1024,
    diskFree: 452.1,
    diskTotal: 512.0,
    dbPoolActive: 3,
    dbPoolMax: 10,
    threadCount: 28,
    healthStatus: 'UP',
  });


  const [isCpuSpikeActive, setIsCpuSpikeActive] = useState(false);
  const [isDbDisrupted, setIsDbDisrupted] = useState(false);


  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'ALL'>('ALL');


  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<MonitoredService | null>(null);


  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warn' | 'info' } | null>(null);

  const logRef = useRef<LogEntry[]>(logs);
  logRef.current = logs;

  const addLog = (level: 'INFO' | 'WARN' | 'ERROR', msg: string, serviceId?: string, serviceName?: string) => {
    const entry = makeLog(level, msg, serviceId, serviceName);
    setLogs((prev) => [...prev, entry]);
  };

  const showBanner = (message: string, type: 'success' | 'warn' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // SSE connection to backend
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: any = null;

    const connectSSE = () => {

      eventSource = new EventSource('/api/stream');

      eventSource.onopen = () => {

        setIsLiveMode(true);
        setConnectionError(null);
        showBanner('Connected to Live Backend API Server', 'success');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.services) setServices(data.services);
          if (data.logs) setLogs(data.logs);
          if (data.actuator) setActuator(data.actuator);
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      eventSource.onerror = () => {
        setIsLiveMode(false);
        setConnectionError('Connection lost. Running in Offline Simulation Mode.');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        
        // retry after 3s
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectSSE();
          }, 3000);
        }
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // keep selectedService in sync with latest data
  useEffect(() => {
    if (!selectedService) return;
    const current = services.find((s) => s.id === selectedService.id);
    if (current && (current.status !== selectedService.status || current.latency !== selectedService.latency || current.lastChecked !== selectedService.lastChecked)) {
      setSelectedService(current);
    }
  }, [services, selectedService]);


  useEffect(() => {
    if (isLiveMode && actuator) {
      if (actuator.isCpuSpikeActive !== undefined) setIsCpuSpikeActive(actuator.isCpuSpikeActive);
      if (actuator.isDbDisrupted !== undefined) setIsDbDisrupted(actuator.isDbDisrupted);
    }
  }, [actuator, isLiveMode]);

  // tick actuator metrics every second (simulation only)
  useEffect(() => {
    if (isLiveMode) return;
    const ticker = setInterval(() => {
      setActuator((prev) => {
        const nextUptime = prev.uptime + 1;
        

        let cpu = isCpuSpikeActive 
          ? 88 + Math.random() * 6 
          : 12 + Math.random() * 10;
        
        let heap = prev.heapUsed + (Math.random() * 10 - 5);
        if (heap < 180) heap = 180;
        if (heap > 400 && !isCpuSpikeActive) heap = 280;
        if (isCpuSpikeActive) heap += Math.random() * 15;
        
        let dbActive = isDbDisrupted ? 0 : 2 + Math.round(Math.random() * 3);
        

        let hStatus: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';
        if (isDbDisrupted) hStatus = 'DOWN';
        else if (isCpuSpikeActive || cpu > 80) hStatus = 'DEGRADED';

        return {
          ...prev,
          uptime: nextUptime,
          cpuUsage: Math.round(cpu * 10) / 10,
          heapUsed: Math.round(heap),
          dbPoolActive: dbActive,
          healthStatus: hStatus,
        };
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [isCpuSpikeActive, isDbDisrupted]);

  // simulated heartbeat loop (runs every 5s when backend is offline)
  useEffect(() => {
    if (isLiveMode || !isSimulating) return;

    // Heartbeat runs every 5s in simulation mode
    const heartbeat = setInterval(() => {
      // Pick a random service to ping/update
      const serviceIndex = Math.floor(Math.random() * services.length);
      const target = services[serviceIndex];

      if (recheckingIds[target.id]) return; // Skip if currently being manual-checked

      setServices((prevServices) => {
        return prevServices.map((srv) => {
          if (srv.id !== target.id) return srv;

          let nextStatus: ServiceStatus = srv.status;
          let nextLatency = srv.latency;

          // db disruption cascades to database services
          if (isDbDisrupted && srv.category === 'database') {
            if (srv.status === 'UP') {
              addLog(
                'ERROR',
                `Cascading Failure: PostgreSQL pool disconnected. Connection Refused on host ${srv.ipAddress}`,
                srv.id,
                srv.name
              );
            }
            nextStatus = 'DOWN';
            nextLatency = 0;
          } else if (srv.status === 'DOWN') {
            const autoRecoverChance = Math.random() > 0.95;
            if (autoRecoverChance && !isDbDisrupted) {
              nextStatus = 'UP';
              nextLatency = Math.round((50 + Math.random() * 40) * 10) / 10;
              addLog(
                'INFO',
                `Service Self-Healing: Healthcheck recovered on port ${srv.port || 80}. Responding in ${nextLatency}ms.`,
                srv.id,
                srv.name
              );
              showBanner(`Service '${srv.name}' has self-healed and is now ONLINE!`, 'success');
            } else {
              nextLatency = 0;
            }
          } else {
            const fluctuation = Math.random() * 10 - 5;
            
            // random intermittent failure (~3% chance)
            const randomFailure = Math.random() > 0.97;
            if (randomFailure) {
              nextStatus = 'DOWN';
              nextLatency = 0;
              addLog(
                'ERROR',
                `Scheduled Check: Critical exception during HTTP GET to ${srv.url}. Connection reset by peer.`,
                srv.id,
                srv.name
              );
              showBanner(`CRITICAL ALERT: '${srv.name}' has shut down!`, 'warn');
            } else {
              const baseMap: Record<ServiceCategory, number> = {
                auth: 35,
                database: 6,
                api: 150,
                web: 80,
                cache: 2,
                infra: 45,
              };
              const base = baseMap[srv.category] || 50;
              nextLatency = Math.round((base + fluctuation + (Math.random() * 5)) * 10) / 10;
              if (nextLatency < 1) nextLatency = 1;
              
              // occasional successful heartbeat log
              if (Math.random() > 0.6) {
                addLog(
                  'INFO',
                  `Heartbeat: Ping [${srv.name}] -> ${srv.ipAddress} UP (${nextLatency}ms). Status Code: 200`,
                  srv.id,
                  srv.name
                );
              }
            }
          }

          // update history (keep last 15 points)
          const nowTimeString = new Date().toLocaleTimeString('en-US', { hour12: false });
          const newHistoryPoint: LatencyPoint = {
            timestamp: nowTimeString,
            value: nextLatency,
            status: nextStatus,
          };
          const nextHistory = [...srv.history.slice(1), newHistoryPoint];

          // recalc uptime
          const totalPoints = nextHistory.length;
          const upPoints = nextHistory.filter((p) => p.status === 'UP').length;
          const simulatedUptime = (upPoints / totalPoints) * 100;

          const updated = {
            ...srv,
            status: nextStatus,
            latency: nextLatency,
            lastChecked: nowTimeString,
            history: nextHistory,
            uptime24h: Number(simulatedUptime.toFixed(2)),
          };


          if (selectedService && selectedService.id === srv.id) {
            setSelectedService(updated);
          }

          return updated;
        });
      });
    }, 5000);

    return () => clearInterval(heartbeat);
  }, [isSimulating, services, recheckingIds, isDbDisrupted, selectedService]);

  const handleForceRecheck = async (id: string) => {
    const target = services.find((s) => s.id === id);
    if (!target) return;

    setRecheckingIds((prev) => ({ ...prev, [id]: true }));
    addLog('INFO', `Manual check triggered for ${target.name}`, target.id, target.name);

    if (isLiveMode) {
      try {
        const res = await fetch(`/api/services/${id}/recheck`, { method: 'POST' });
        if (!res.ok) throw new Error('API manual ping execution failed');
        showBanner(`Manual health check triggered for '${target.name}'`, 'success');
      } catch (err) {
        console.error(err);
        showBanner(`Failed to ping '${target.name}' via API`, 'warn');
      } finally {
        setRecheckingIds((prev) => ({ ...prev, [id]: false }));
      }
    } else {
      // simulate a ~1.2s network round-trip
      setTimeout(() => {
        setServices((prevServices) => {
          return prevServices.map((srv) => {
            if (srv.id !== id) return srv;

            let nextStatus: ServiceStatus = srv.status;
            let nextLatency = srv.latency;

            // db disruption fails manual pings too
            if (isDbDisrupted && srv.category === 'database') {
              nextStatus = 'DOWN';
              nextLatency = 0;
              addLog(
                'ERROR',
                `Manual Check Failed: Database pool exhausted. Exception in HikariDataSource lookup.`,
                srv.id,
                srv.name
              );
              showBanner(`Manual check failed for DB '${srv.name}': Link Unreachable`, 'warn');
            } else {
              nextStatus = 'UP';
              const baseMap: Record<ServiceCategory, number> = {
                auth: 35,
                database: 6,
                api: 150,
                web: 80,
                cache: 2,
                infra: 45,
              };
              const base = baseMap[srv.category] || 50;
              nextLatency = Math.round((base + (Math.random() * 8 - 4)) * 10) / 10;
              if (nextLatency < 1) nextLatency = 1;

              addLog(
                'INFO',
                `Manual Check Success: [${srv.name}] is UP. Latency: ${nextLatency}ms. Route validated.`,
                srv.id,
                srv.name
              );
              showBanner(`Manual health check successful for '${srv.name}'`, 'success');
            }

            const nowTimeString = new Date().toLocaleTimeString('en-US', { hour12: false });
            const newHistoryPoint: LatencyPoint = {
              timestamp: nowTimeString,
              value: nextLatency,
              status: nextStatus,
            };
            const nextHistory = [...srv.history.slice(1), newHistoryPoint];

            const updated = {
              ...srv,
              status: nextStatus,
              latency: nextLatency,
              lastChecked: nowTimeString,
              history: nextHistory,
            };

            if (selectedService && selectedService.id === srv.id) {
              setSelectedService(updated);
            }

            return updated;
          });
        });

        setRecheckingIds((prev) => ({ ...prev, [id]: false }));
      }, 1200);
    }
  };

  const handleForceGlobalCheck = async () => {
    setIsGlobalRechecking(true);
    addLog('INFO', 'Global Command: Initiating out-of-band ping cascade for all registered services...');
    showBanner('Triggering global command ping sweep...', 'info');

    if (isLiveMode) {
      try {
        const res = await fetch('/api/services/recheck', { method: 'POST' });
        if (!res.ok) throw new Error('API global sweep execution failed');
        showBanner('Global health check sweep triggered', 'success');
      } catch (err) {
        console.error(err);
        showBanner('Failed to trigger global sweep', 'warn');
      } finally {
        setIsGlobalRechecking(false);
      }
    } else {
      let completedCount = 0;
      services.forEach((srv) => {
        setRecheckingIds((prev) => ({ ...prev, [srv.id]: true }));
        
        setTimeout(() => {
          setServices((prevServices) => {
            return prevServices.map((currentSrv) => {
              if (currentSrv.id !== srv.id) return currentSrv;

              let nextStatus: ServiceStatus = currentSrv.status;
              let nextLatency = currentSrv.latency;

              if (isDbDisrupted && currentSrv.category === 'database') {
                nextStatus = 'DOWN';
                nextLatency = 0;
              } else {
                nextStatus = 'UP';
                const baseMap: Record<ServiceCategory, number> = {
                  auth: 35,
                  database: 6,
                  api: 150,
                  web: 80,
                  cache: 2,
                  infra: 45,
                };
                const base = baseMap[currentSrv.category] || 50;
                nextLatency = Math.round((base + (Math.random() * 10 - 5)) * 10) / 10;
              }

              const nowTimeString = new Date().toLocaleTimeString('en-US', { hour12: false });
              const newHistoryPoint: LatencyPoint = {
                timestamp: nowTimeString,
                value: nextLatency,
                status: nextStatus,
              };
              
              const updated = {
                ...currentSrv,
                status: nextStatus,
                latency: nextLatency,
                lastChecked: nowTimeString,
                history: [...currentSrv.history.slice(1), newHistoryPoint],
              };

              if (selectedService && selectedService.id === currentSrv.id) {
                setSelectedService(updated);
              }

              return updated;
            });
          });

          setRecheckingIds((prev) => ({ ...prev, [srv.id]: false }));
          completedCount++;

          if (completedCount === services.length) {
            setIsGlobalRechecking(false);
            addLog('INFO', 'Global Command Sweep Complete: All network routes validated.');
            showBanner('Global heartbeat sweep complete.', 'success');
          }
        }, 500 + Math.random() * 1000); // stagger results
      });
    }
  };

  const handleToggleServiceStatus = async (id: string) => {
    const target = services.find((s) => s.id === id);
    if (!target) return;

    if (isLiveMode) {
      try {
        const res = await fetch(`/api/services/${id}/toggle`, { method: 'POST' });
        if (!res.ok) throw new Error('API status toggle failed');
        showBanner(`State toggled for '${target.name}'`, 'info');
      } catch (err) {
        console.error(err);
        showBanner(`Failed to toggle status for '${target.name}'`, 'warn');
      }
    } else {
      setServices((prevServices) => {
        return prevServices.map((srv) => {
          if (srv.id !== id) return srv;

          const nextStatus: ServiceStatus = srv.status === 'UP' ? 'DOWN' : 'UP';
          const nextLatency = nextStatus === 'UP' ? 35 : 0;
          const nowTimeString = new Date().toLocaleTimeString('en-US', { hour12: false });
          
          addLog(
            nextStatus === 'UP' ? 'INFO' : 'ERROR',
            `Manual Toggle: Operator forced health state to ${nextStatus}`,
            srv.id,
            srv.name
          );
          showBanner(`State forced to ${nextStatus} for '${srv.name}'`, nextStatus === 'UP' ? 'success' : 'warn');

          const newHistoryPoint: LatencyPoint = {
            timestamp: nowTimeString,
            value: nextLatency,
            status: nextStatus,
          };

          const updated = {
            ...srv,
            status: nextStatus,
            latency: nextLatency,
            lastChecked: nowTimeString,
            history: [...srv.history.slice(1), newHistoryPoint],
          };

          if (selectedService && selectedService.id === srv.id) {
            setSelectedService(updated);
          }

          return updated;
        });
      });
    }
  };

  const handleSaveInventory = async (formData: Partial<MonitoredService>) => {
    if (editingService) {
      if (isLiveMode) {
        try {
          const res = await fetch(`/api/services/${editingService.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
          if (!res.ok) throw new Error('API edit service failed');
          showBanner(`Inventory spec updated for '${formData.name}'`);
        } catch (err) {
          console.error(err);
          showBanner(`Failed to update service '${formData.name}' via API`, 'warn');
        } finally {
          setEditingService(null);
        }
      } else {
        setServices((prev) =>
          prev.map((srv) => {
            if (srv.id !== editingService.id) return srv;

            const updated = {
              ...srv,
              ...formData,
              lastChecked: new Date().toLocaleTimeString('en-US', { hour12: false }),
            } as MonitoredService;

            addLog('INFO', `Inventory API: Updated spec configuration for [${updated.name}]`, updated.id, updated.name);
            showBanner(`Inventory spec updated for '${updated.name}'`);

            if (selectedService && selectedService.id === srv.id) {
              setSelectedService(updated);
            }

            return updated;
          })
        );
        setEditingService(null);
      }
    } else {
      if (isLiveMode) {
        try {
          const res = await fetch('/api/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
          if (!res.ok) throw new Error('API add service failed');
          const newSrv = await res.json();
          showBanner(`Registered service '${newSrv.name}' into monitor index`);
        } catch (err) {
          console.error(err);
          showBanner(`Failed to register service '${formData.name}' via API`, 'warn');
        }
      } else {
        const newId = Math.random().toString(36).substr(2, 9);
        const nowTimeString = new Date().toLocaleTimeString('en-US', { hour12: false });
        
        const baseHistory: LatencyPoint[] = Array.from({ length: 12 }).map((_, index) => {
          const time = new Date(Date.now() - (11 - index) * 2 * 60 * 1000);
          return {
            timestamp: time.toLocaleTimeString('en-US', { hour12: false }),
            value: 20 + Math.random() * 20,
            status: 'UP' as ServiceStatus,
          };
        });

        const newService: MonitoredService = {
          id: newId,
          name: formData.name || 'Unnamed Endpoint',
          url: formData.url || 'http://localhost',
          category: formData.category || 'web',
          status: 'UP',
          latency: 24.5,
          lastChecked: nowTimeString,
          history: baseHistory,
          interval: formData.interval || 60,
          uptime24h: 100.00,
          description: formData.description || 'No description supplied',
          ipAddress: formData.ipAddress || '127.0.0.1',
          port: formData.port,
        };

        setServices((prev) => [...prev, newService]);
        addLog('INFO', `Inventory API: Registered new service [${newService.name}] at ${newService.url}`, newService.id, newService.name);
        showBanner(`Registered service '${newService.name}' into monitor index`);
        setSelectedService(newService);
      }
    }
  };

  const handleDeleteService = async (id: string) => {
    const target = services.find((s) => s.id === id);
    if (!target) return;

    if (confirm(`Confirm removing service '${target.name}' from active reliability inventory?`)) {
      if (isLiveMode) {
        try {
          const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('API delete service failed');
          showBanner(`Removed '${target.name}' from inventory index`, 'warn');
        } catch (err) {
          console.error(err);
          showBanner(`Failed to delete service '${target.name}' via API`, 'warn');
        }
      } else {
        setServices((prev) => prev.filter((s) => s.id !== id));
        addLog('WARN', `Inventory API: Deregistered and removed [${target.name}] from metrics pooling.`);
        showBanner(`Removed '${target.name}' from inventory index`, 'warn');

        if (selectedService && selectedService.id === id) {
          setSelectedService(null);
        }
      }
    }
  };

  const handleSimulateCpuSpike = async () => {
    if (isLiveMode) {
      try {
        await fetch('/api/actuator/simulate/cpu', { method: 'POST' });
      } catch (err) {
        console.error(err);
      }
    } else {
      setIsCpuSpikeActive(!isCpuSpikeActive);
      
      if (!isCpuSpikeActive) {
        addLog('WARN', 'Simulation: CPU load spike active');
        showBanner('Simulation: CPU load spike active', 'warn');
      } else {
        addLog('INFO', 'Simulation: CPU load restored to normal');
        showBanner('Simulation cleared: CPU load normal', 'success');
      }
    }
  };

  const handleSimulateDbDisruption = async () => {
    if (isLiveMode) {
      try {
        await fetch('/api/actuator/simulate/db', { method: 'POST' });
      } catch (err) {
        console.error(err);
      }
    } else {
      setIsDbDisrupted(!isDbDisrupted);

      if (!isDbDisrupted) {
        addLog('ERROR', 'Simulation: Database pool disrupted');
        showBanner('Simulation: Database pool disrupted', 'warn');

        // cascade failure to all database-category services
        setServices((prev) =>
          prev.map((srv) => {
            if (srv.category !== 'database') return srv;

            const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
            addLog(
              'ERROR',
              `Database check failed: pg-db-prod connection refused`,
              srv.id,
              srv.name
            );

            const updated = {
              ...srv,
              status: 'DOWN' as ServiceStatus,
              latency: 0,
              lastChecked: nowTime,
              history: [...srv.history.slice(1), { timestamp: nowTime, value: 0, status: 'DOWN' as ServiceStatus }],
            };

            if (selectedService && selectedService.id === srv.id) {
              setSelectedService(updated);
            }
            return updated;
          })
        );
      } else {
        addLog('INFO', 'Simulation: Database pool restored');
        showBanner('Simulation cleared: Database pool restored', 'success');
      }
    }
  };

  const handleTriggerGc = async () => {
    if (isLiveMode) {
      try {
        await fetch('/api/actuator/gc', { method: 'POST' });
      } catch (err) {
        console.error(err);
      }
      addLog('INFO', 'System GC triggered manually');
      
      setActuator((prev) => ({
        ...prev,
        cpuUsage: 85.0,
      }));

      setTimeout(() => {
        setActuator((prev) => ({
          ...prev,
          heapUsed: 112,
          cpuUsage: 14.2,
        }));
        addLog('INFO', 'System GC complete: heap reclaimed');
        showBanner('System GC complete: heap reclaimed', 'success');
      }, 800);
    }
  };

  const handleResetMetrics = async () => {
    if (isLiveMode) {
      try {
        await fetch('/api/actuator/simulate/reset', { method: 'POST' });
      } catch (err) {
        console.error(err);
      }
    } else {
      setIsCpuSpikeActive(false);
      setIsDbDisrupted(false);
      addLog('INFO', 'Simulator: Resetted all simulated disruptions');
      showBanner('All simulated disruptions resolved');
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      const matchesSearch =
        srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'ALL' || srv.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, selectedCategory]);

  const stats = useMemo(() => {
    const total = services.length;
    const up = services.filter((s) => s.status === 'UP').length;
    const down = total - up;
    
    const upLatencies = services.filter((s) => s.status === 'UP').map((s) => s.latency);
    const avgLatency =
      upLatencies.length > 0
        ? Math.round((upLatencies.reduce((a, b) => a + b, 0) / upLatencies.length) * 10) / 10
        : 0;

    const totalUptimePct =
      services.reduce((acc, s) => acc + s.uptime24h, 0) / (total || 1);

    return {
      total,
      up,
      down,
      avgLatency,
      uptime: Number(totalUptimePct.toFixed(3)),
    };
  }, [services]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100 font-sans selection:bg-indigo-500/30 selection:text-white pb-10 transition-colors duration-300">
      

      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-2xl animate-in slide-in-from-top-3 duration-200 ${
            notification.type === 'warn'
              ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'
              : notification.type === 'info'
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400'
              : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
          }`}
        >
          <Radio className="h-4 w-4 animate-pulse" />
          <span className="font-mono text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 dark:border-neutral-900 dark:bg-neutral-950/80 py-4.5 backdrop-blur-md transition-colors duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">

          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 dark:bg-neutral-900 dark:border-neutral-800">
              <Activity className="h-5 w-5 text-indigo-500 animate-pulse" />
              <div className="absolute top-0 right-0 h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans text-base font-bold tracking-tight text-slate-800 dark:text-neutral-50 uppercase">
                  Centralized Monitoring Command Center
                </h1>
                <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-indigo-600 dark:text-indigo-400">
                  PROACTIVE_V1.0
                </span>
              </div>
              <p className="font-mono text-[10px] text-slate-450 dark:text-neutral-500 tracking-wider">
                Service Reliability Initiative | 99.9% Target Availability SLA
              </p>
            </div>
          </div>


          <div className="flex items-center gap-3">

            <div
              onClick={() => setIsSimulating(!isSimulating)}
              title="Toggle automatic simulation heartbeat loops"
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 cursor-pointer transition ${
                isSimulating
                  ? 'border-indigo-200 bg-indigo-50/80 text-indigo-600 hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/5 dark:text-indigo-400 dark:hover:bg-indigo-500/10'
                  : 'border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-200 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-500 dark:hover:border-neutral-700'
              }`}
            >
              {isSimulating ? (
                <>
                  <Play className="h-3 w-3 fill-indigo-500 dark:fill-indigo-400 text-indigo-500" />
                  <span className="font-mono text-[10px] font-semibold">HEARTBEAT_LIVE (5s)</span>
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3 text-slate-500" />
                  <span className="font-mono text-[10px] font-semibold">HEARTBEATS_PAUSED</span>
                </>
              )}
            </div>


            <button
              id="btn-global-sweep"
              onClick={handleForceAllServicesHealthCheck}
              disabled={isGlobalRechecking}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 px-3 font-sans text-[11px] font-semibold text-slate-600 dark:text-neutral-300 transition hover:border-slate-300 hover:bg-slate-50 dark:hover:border-neutral-700 dark:hover:bg-neutral-900 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isGlobalRechecking ? 'animate-spin text-emerald-500 dark:text-emerald-400' : ''}`} />
              Sweep All Heartbeats
            </button>


            <button
              id="btn-trigger-add-service"
              onClick={() => {
                setEditingService(null);
                setIsFormModalOpen(true);
              }}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-neutral-50 dark:hover:bg-neutral-200 dark:text-neutral-950 px-3 font-sans text-[11px] font-semibold transition"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              Add Service Spec
            </button>


            <button
              id="btn-toggle-theme"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title="Toggle Application Theme"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-900 cursor-pointer"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-500 dark:text-amber-400" />}
            </button>
          </div>
        </div>
      </header>


      <div className={`w-full py-1.5 px-6 font-mono text-[10px] font-semibold flex items-center justify-between border-b transition-colors duration-300 ${
        isLiveMode
          ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/25 dark:text-emerald-450 dark:border-emerald-950/50'
          : 'bg-amber-50/50 text-amber-700 border-amber-100 dark:bg-amber-950/25 dark:text-amber-450 dark:border-amber-950/50'
      }`}>
        <div className="mx-auto max-w-7xl w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isLiveMode ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
            <span>
              OPERATING MODE: {isLiveMode ? 'CONNECTED TO HEARTBEAT DAEMON' : 'OFFLINE IN-MEMORY SIMULATION'}
            </span>
          </div>
          <div>
            {isLiveMode ? (
              <span className="text-emerald-600 dark:text-emerald-500">Live SSE telemetry streaming active (Port 3001)</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-500">Backend API unreachable — Running in-memory mock simulator</span>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 mt-8 space-y-8">

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          
          <MetricCard
            id="metric-total-inventory"
            title="Monitored Inventory"
            value={stats.total}
            subtext="Registered infrastructure specs"
            icon={LayoutGrid}
            color="zinc"
          />

          <MetricCard
            id="metric-active-channels"
            title="Active Services"
            value={`${stats.up} / ${stats.total}`}
            subtext="Active routes pinged UP"
            icon={CheckCircle}
            color={stats.down > 0 ? 'amber' : 'emerald'}
            trend={stats.down > 0 ? { value: `-${stats.down} Offline`, isPositive: false } : undefined}
          />

          <MetricCard
            id="metric-average-latency"
            title="Avg Response Latency"
            value={`${stats.avgLatency} ms`}
            subtext="Global ping averages"
            icon={TrendingUp}
            color="indigo"
          />

          <MetricCard
            id="metric-overall-uptime"
            title="Ecosystem Integrity"
            value={`${stats.uptime.toFixed(3)}%`}
            subtext="Aggregated uptime average"
            icon={Clock}
            color="emerald"
            trend={{ value: '99.9% Target', isPositive: true }}
          />

        </div>


        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          <div className="lg:col-span-7 space-y-5">

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border border-slate-200 bg-white dark:border-neutral-900 dark:bg-neutral-900/40 p-3.5 rounded-xl transition-colors duration-300 shadow-sm dark:shadow-none">

              <div className="relative flex-1">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400 dark:text-neutral-500" />
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search inventory address, host or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 dark:border-neutral-800 dark:bg-neutral-950 pl-10 pr-3 font-sans text-xs text-slate-700 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-indigo-500/50 focus:outline-none transition-colors duration-300"
                />
              </div>


              <div className="flex flex-wrap gap-1.5">
                {(['ALL', 'web', 'api', 'database', 'auth', 'cache', 'infra'] as const).map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      id={`btn-category-${cat}`}
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-lg px-2.5 py-1.5 font-mono text-[9px] font-semibold tracking-wider uppercase border transition cursor-pointer ${
                        isActive
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-500 dark:hover:border-neutral-700 dark:hover:text-neutral-300'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>


            {filteredServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-100/40 dark:border-neutral-800 dark:bg-neutral-900/10 p-16 text-center transition-colors duration-300">
                <AlertOctagon className="h-10 w-10 text-slate-350 dark:text-neutral-600 animate-pulse" />
                <h3 className="mt-4 font-sans text-sm font-semibold text-slate-700 dark:text-neutral-300">
                  No Monitored Specs Found
                </h3>
                <p className="mt-1 text-xs text-slate-400 dark:text-neutral-500 max-w-sm">
                  We could not find any service matching search criteria '{searchQuery}'. Try altering filter category tags.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredServices.map((srv) => (
                  <ServiceCard
                    key={srv.id}
                    id={`service-card-${srv.id}`}
                    service={srv}
                    onForceRecheck={handleForceRecheck}
                    onEdit={(item) => {
                      setEditingService(item);
                      setIsFormModalOpen(true);
                    }}
                    onDelete={handleDeleteService}
                    onSelect={(item) => setSelectedService(item)}
                    isRechecking={!!recheckingIds[srv.id]}
                    isSelected={!!selectedService && selectedService.id === srv.id}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/30 rounded-xl p-5 shadow-lg min-h-[500px] flex flex-col justify-between transition-colors duration-300 shadow-sm dark:shadow-none">
            
            {selectedService ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div>

                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-[9px] font-bold text-indigo-600 dark:border-indigo-500/10 dark:bg-indigo-500/5 dark:text-indigo-400 uppercase tracking-widest">
                        {selectedService.category} SPECIFICATION
                      </span>
                      <h2 className="mt-2 font-sans text-lg font-bold text-slate-800 dark:text-neutral-100 leading-tight">
                        {selectedService.name}
                      </h2>
                      <span className="mt-1 block font-mono text-[11px] text-slate-500 dark:text-neutral-400 select-all">
                        {selectedService.url}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {selectedService.status === 'UP' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:border-emerald-500/15 dark:bg-emerald-500/5 dark:text-emerald-400">
                          ONLINE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-600 dark:border-rose-500/15 dark:bg-rose-500/5 dark:text-rose-400 animate-pulse">
                          OFFLINE
                        </span>
                      )}
                    </div>
                  </div>


                  <div className="mt-6">
                    <span className="block font-mono text-[9px] text-slate-450 dark:text-neutral-500 uppercase tracking-wider mb-2.5">
                      ACTIVE TRACE INSPECTION
                    </span>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 dark:bg-neutral-950/40 dark:border-neutral-950/80 p-4 shadow-inner">
                      <ServiceChart
                        id="detailed-service-chart"
                        history={selectedService.history}
                        status={selectedService.status}
                        height={180}
                        width={460}
                        interactive={true}
                      />
                    </div>
                  </div>


                  <div className="mt-6 space-y-3">
                    <span className="block font-mono text-[9px] text-slate-450 dark:text-neutral-500 uppercase tracking-wider">
                      SPECIFICATION ATTRIBUTES
                    </span>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 dark:border-neutral-950 dark:bg-neutral-950/20 p-4.5 font-mono text-xs text-slate-600 dark:text-neutral-300 divide-y divide-slate-100 dark:divide-neutral-950/40">
                      
                      <div className="flex justify-between py-2 items-center">
                        <span className="text-slate-450 dark:text-neutral-500">TARGET HOST IP:</span>
                        <span className="font-semibold text-slate-800 dark:text-neutral-100">{selectedService.ipAddress}</span>
                      </div>

                      <div className="flex justify-between py-2 items-center">
                        <span className="text-slate-450 dark:text-neutral-500">PORT MAPPED:</span>
                        <span className="font-semibold text-slate-800 dark:text-neutral-100">{selectedService.port || 'DEFAULT'}</span>
                      </div>

                      <div className="flex justify-between py-2 items-center">
                        <span className="text-slate-450 dark:text-neutral-500">SCHEDULER POLL RATE:</span>
                        <span className="font-semibold text-slate-800 dark:text-neutral-100">{selectedService.interval} SECONDS</span>
                      </div>

                      <div className="flex justify-between py-2 items-center">
                        <span className="text-slate-450 dark:text-neutral-500">24H INTEGRITY RATIO:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedService.uptime24h.toFixed(2)}%</span>
                      </div>

                      <div className="flex justify-between py-2 items-center font-sans">
                        <span className="text-slate-450 dark:text-neutral-500 font-mono text-xs">SPEC OVERVIEW:</span>
                        <span className="text-right text-xs text-slate-600 dark:text-neutral-400 max-w-[220px] leading-snug">
                          {selectedService.description}
                        </span>
                      </div>

                    </div>
                  </div>
                </div>


                <div className="mt-6 border-t border-slate-100 dark:border-neutral-800/80 pt-4 space-y-3.5">
                  <span className="block font-mono text-[9px] text-slate-450 dark:text-neutral-500 uppercase tracking-wider">
                    OPERATOR INTERVENTIONS FOR THIS ENDPOINT
                  </span>
                  
                  <div className="flex flex-wrap items-center gap-3">
  
                    <button
                      id="btn-trigger-toggle-offline"
                      onClick={() => handleToggleServiceStatus(selectedService.id)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 font-sans text-xs font-semibold transition duration-200 cursor-pointer ${
                        selectedService.status === 'UP'
                          ? 'border-slate-200 bg-slate-50 text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-rose-400 dark:hover:border-rose-500/20 dark:hover:bg-rose-500/5'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
                      }`}
                    >
                      {selectedService.status === 'UP' ? (
                        <>
                          <WifiOff className="h-3.5 w-3.5" />
                          Simulate Force Down
                        </>
                      ) : (
                        <>
                          <Wifi className="h-3.5 w-3.5 animate-bounce" />
                          Simulate Recover Up
                        </>
                      )}
                    </button>


                    <button
                      id="btn-trigger-force-ping"
                      onClick={() => handleForceRecheck(selectedService.id)}
                      disabled={!!recheckingIds[selectedService.id]}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-neutral-50 dark:hover:bg-neutral-200 dark:text-neutral-950 px-3 py-2 font-sans text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${recheckingIds[selectedService.id] ? 'animate-spin' : ''}`} />
                      Manual Sync Check
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Sliders className="h-10 w-10 text-slate-350 dark:text-neutral-700 animate-pulse mb-4" />
                <h3 className="font-sans text-sm font-semibold text-slate-600 dark:text-neutral-400">
                  No Active Inspect Target
                </h3>
                <p className="mt-1 text-xs text-slate-450 dark:text-neutral-500 max-w-xs">
                  Select any service item in the inventory registry grid to initialize deep trace graphs, metrics diagnostics, and manual intervention controls.
                </p>
              </div>
            )}

          </div>

        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          
          <ActuatorPanel
            id="actuator-self-observability"
            metrics={actuator}
            onSimulateCpuSpike={handleSimulateCpuSpike}
            onSimulateDbDisruption={handleSimulateDbDisruption}
            onTriggerGc={handleTriggerGc}
            onResetMetrics={handleResetMetrics}
            isCpuSpikeActive={isCpuSpikeActive}
            isDbDisrupted={isDbDisrupted}
          />

          <LogTerminal
            id="live-log-terminal"
            logs={logs}
            onClearLogs={() => {
              setLogs([]);
              addLog('INFO', 'Log terminal trace output purged by system operator.');
            }}
          />

        </div>

      </main>

      <ServiceFormModal
        id="service-inventory-modal"
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingService(null);
        }}
        onSave={handleSaveInventory}
        service={editingService}
      />

    </div>
  );

  function handleForceAllServicesHealthCheck() {
    handleForceGlobalCheck();
  }
}
