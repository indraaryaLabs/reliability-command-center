import express from 'express';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { performance } from 'perf_hooks';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'db.json');


export type ServiceCategory = 'web' | 'api' | 'database' | 'auth' | 'cache' | 'infra';
export type ServiceStatus = 'UP' | 'DOWN' | 'PENDING';

export interface LatencyPoint {
  timestamp: string; // HH:mm:ss
  value: number; // latency in ms
  status: ServiceStatus;
}

export interface MonitoredService {
  id: string;
  name: string;
  url: string;
  category: ServiceCategory;
  status: ServiceStatus;
  latency: number;
  lastChecked: string;
  history: LatencyPoint[];
  interval: number; // in seconds
  uptime24h: number; // uptime percent
  description: string;
  ipAddress: string;
  port?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string; // HH:mm:ss.SSS
  serviceId?: string;
  serviceName?: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

export interface ActuatorMetrics {
  uptime: number; // in seconds
  cpuUsage: number;
  heapUsed: number;
  heapMax: number;
  diskFree: number;
  diskTotal: number;
  dbPoolActive: number;
  dbPoolMax: number;
  threadCount: number;
  healthStatus: 'UP' | 'DOWN' | 'DEGRADED';
  isCpuSpikeActive?: boolean;
  isDbDisrupted?: boolean;
}


const serverStartTime = Date.now();
let isCpuSpikeActive = false;
let isDbDisrupted = false;
let actuatorHeapBase = 245;

let sseClients: express.Response[] = [];


const getTimestamp = () => new Date().toLocaleTimeString('en-US', { hour12: false });
const getDetailedTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
};


const createLog = (level: 'INFO' | 'WARN' | 'ERROR', message: string, serviceId?: string, serviceName?: string): LogEntry => {
  return {
    id: Math.random().toString(36).substring(2, 11),
    timestamp: getDetailedTimestamp(),
    serviceId,
    serviceName,
    level,
    message
  };
};


const getInitialDb = () => {
  const services: MonitoredService[] = [
    {
      id: '1',
      name: 'Auth-Broker Service',
      url: 'https://auth.internal.corp',
      category: 'auth',
      status: 'UP',
      latency: 34.2,
      lastChecked: getTimestamp(),
      history: Array.from({ length: 12 }).map((_, i) => ({
        timestamp: new Date(Date.now() - (11 - i) * 2 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false }),
        value: 30 + Math.random() * 8,
        status: 'UP'
      })),
      interval: 30,
      uptime24h: 100.00,
      description: 'Handles SSO authentication and JWT token generation.',
      ipAddress: '10.0.4.15',
      port: 443,
    },
    {
      id: '2',
      name: 'Primary PostgreSQL Cluster',
      url: 'postgresql://pg-db-prod.internal:5432',
      category: 'database',
      status: 'UP',
      latency: 5.8,
      lastChecked: getTimestamp(),
      history: Array.from({ length: 12 }).map((_, i) => ({
        timestamp: new Date(Date.now() - (11 - i) * 2 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false }),
        value: 5 + Math.random() * 2,
        status: 'UP'
      })),
      interval: 60,
      uptime24h: 100.00,
      description: 'Main SQL database for user profiles, transactions, and catalogs.',
      ipAddress: '10.0.12.8',
      port: 5432,
    },
    {
      id: '3',
      name: 'Stripe Payments REST Gateway',
      url: 'https://api.payments.corp',
      category: 'api',
      status: 'UP',
      latency: 184.5,
      lastChecked: getTimestamp(),
      history: Array.from({ length: 12 }).map((_, i) => ({
        timestamp: new Date(Date.now() - (11 - i) * 2 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false }),
        value: 170 + Math.random() * 30,
        status: 'UP'
      })),
      interval: 60,
      uptime24h: 99.81,
      description: 'Integration gateway for credit card payments and stripe webhooks.',
      ipAddress: '18.204.9.45',
      port: 443,
    },
    {
      id: '4',
      name: 'Core System API Broker',
      url: 'https://gateway.internal.corp/api/v1',
      category: 'api',
      status: 'UP',
      latency: 22.1,
      lastChecked: getTimestamp(),
      history: Array.from({ length: 12 }).map((_, i) => ({
        timestamp: new Date(Date.now() - (11 - i) * 2 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false }),
        value: 20 + Math.random() * 4,
        status: 'UP'
      })),
      interval: 30,
      uptime24h: 99.95,
      description: 'Central routing and rate-limiting gateway for internal microservices.',
      ipAddress: '10.0.2.1',
      port: 8080,
    },
    {
      id: '5',
      name: 'Customer Support Engagement Portal',
      url: 'https://support.corp.io',
      category: 'web',
      status: 'UP',
      latency: 82.4,
      lastChecked: getTimestamp(),
      history: Array.from({ length: 12 }).map((_, i) => ({
        timestamp: new Date(Date.now() - (11 - i) * 2 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false }),
        value: 75 + Math.random() * 15,
        status: 'UP'
      })),
      interval: 60,
      uptime24h: 99.74,
      description: 'Helpdesk support portal website with ticketing and chat.',
      ipAddress: '10.0.10.100',
      port: 443,
    },
    {
      id: '6',
      name: 'Redis In-Memory Session Cache',
      url: 'redis://redis-cache-01.internal:6379',
      category: 'cache',
      status: 'UP',
      latency: 1.8,
      lastChecked: getTimestamp(),
      history: Array.from({ length: 12 }).map((_, i) => ({
        timestamp: new Date(Date.now() - (11 - i) * 2 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false }),
        value: 1.2 + Math.random() * 1,
        status: 'UP'
      })),
      interval: 30,
      uptime24h: 100.00,
      description: 'Redis instance for session storage and query caching.',
      ipAddress: '10.0.8.22',
      port: 6379,
    },
    {
      id: '7',
      name: 'S3 Invoice Document Vault',
      url: 's3://corp-doc-vault',
      category: 'infra',
      status: 'DOWN',
      latency: 0,
      lastChecked: getTimestamp(),
      history: Array.from({ length: 12 }).map((_, i) => ({
        timestamp: new Date(Date.now() - (11 - i) * 2 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false }),
        value: i > 5 ? 0 : 40 + Math.random() * 10,
        status: i > 5 ? 'DOWN' : 'UP'
      })),
      interval: 60,
      uptime24h: 98.15,
      description: 'AWS S3 bucket storing PDF invoices and profile attachments.',
      ipAddress: '52.216.12.89',
      port: 80,
    },
  ];

  const logs: LogEntry[] = [
    createLog('INFO', 'Initializing health check service...'),
    createLog('INFO', 'Loaded service inventory with 7 monitored endpoints.'),
    createLog('INFO', 'Database connection pool initialized: Status: UP'),
    createLog('INFO', 'Starting health check scheduler...'),
    createLog('INFO', 'Ping: [Auth-Broker Service] -> 10.0.4.15:443 UP (34.2ms)'),
    createLog('INFO', 'Ping: [Primary PostgreSQL Cluster] -> 10.0.12.8:5432 UP (5.8ms)'),
    createLog('INFO', 'Ping: [Stripe Payments REST Gateway] -> 18.204.9.45:443 UP (184.5ms)'),
    createLog('INFO', 'Ping: [Core System API Broker] -> 10.0.2.1:8080 UP (22.1ms)'),
    createLog('INFO', 'Ping: [Customer Support Engagement Portal] -> 10.0.10.100:443 UP (82.4ms)'),
    createLog('INFO', 'Ping: [Redis In-Memory Session Cache] -> 10.0.8.22:6379 UP (1.8ms)'),
    createLog('ERROR', 'Ping: [S3 Invoice Document Vault] -> Connection timeout on port 80.'),
    createLog('WARN', 'Service [S3 Invoice Document Vault] is DOWN. Raising alert!'),
    createLog('INFO', 'Dashboard backend server started successfully.')
  ];

  return { services, logs };
};


const loadDb = (): { services: MonitoredService[]; logs: LogEntry[] } => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const data = getInitialDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
      return data;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading database file. Reverting to initial seed.', err);
    return getInitialDb();
  }
};

const saveDb = (data: { services: MonitoredService[]; logs: LogEntry[] }) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving database file:', err);
  }
};

const addLogEntry = (level: 'INFO' | 'WARN' | 'ERROR', message: string, serviceId?: string, serviceName?: string) => {
  const db = loadDb();
  const entry = createLog(level, message, serviceId, serviceName);
  db.logs.push(entry);
  
  // cap at 100 entries
  if (db.logs.length > 100) {
    db.logs.shift();
  }
  
  saveDb(db);
  broadcastUpdate(db);
};


const getActuatorMetrics = (): ActuatorMetrics => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  
  // cpu spike or normal oscillation
  let cpuUsage = isCpuSpikeActive 
    ? 88 + Math.random() * 6 
    : 10 + Math.random() * 8;
  

  let heapUsed = actuatorHeapBase + (Math.random() * 8 - 4);
  if (isCpuSpikeActive) heapUsed += 150 + Math.random() * 20;
  if (heapUsed < 90) heapUsed = 90;
  if (heapUsed > 800) heapUsed = 750;


  let dbPoolActive = isDbDisrupted ? 0 : 2 + Math.floor(Math.random() * 3);
  
  let healthStatus: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';
  if (isDbDisrupted) healthStatus = 'DOWN';
  else if (isCpuSpikeActive || cpuUsage > 80) healthStatus = 'DEGRADED';

  return {
    uptime,
    cpuUsage: Math.round(cpuUsage * 10) / 10,
    heapUsed: Math.round(heapUsed),
    heapMax: 1024,
    diskFree: 452.1,
    diskTotal: 512.0,
    dbPoolActive,
    dbPoolMax: 10,
    threadCount: isCpuSpikeActive ? 64 : 28,
    healthStatus,
    isCpuSpikeActive,
    isDbDisrupted
  };
};


const broadcastUpdate = (dbState?: { services: MonitoredService[]; logs: LogEntry[] }) => {
  const db = dbState || loadDb();
  const actuator = getActuatorMetrics();
  
  const payload = JSON.stringify({
    services: db.services,
    logs: db.logs,
    actuator
  });

  sseClients.forEach((res) => {
    res.write(`data: ${payload}\n\n`);
  });
};


const pingService = async (service: MonitoredService): Promise<{ status: ServiceStatus; latency: number; logMessage: string; level: 'INFO' | 'WARN' | 'ERROR' }> => {

  if (isDbDisrupted && service.category === 'database') {
    return {
      status: 'DOWN',
      latency: 0,
      logMessage: `Healthcheck Failure (Cascading): PostgreSQL Connection Pool disrupted. Active links collapsed to 0.`,
      level: 'ERROR'
    };
  }

  const start = performance.now();
  const isHttp = service.url.startsWith('http://') || service.url.startsWith('https://');

  if (isHttp) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(service.url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'ReliabilityCommandCenter/1.0' }
      });
      
      clearTimeout(id);
      const end = performance.now();
      const latency = Math.round((end - start) * 10) / 10;

      if (response.status >= 200 && response.status < 400) {
        return {
          status: 'UP',
          latency,
          logMessage: `Heartbeat: GET [${service.name}] -> ${service.ipAddress} UP (${latency}ms). Status Code: ${response.status}`,
          level: 'INFO'
        };
      } else {
        return {
          status: 'DOWN',
          latency: 0,
          logMessage: `Heartbeat Error: GET [${service.name}] responded with HTTP status ${response.status}`,
          level: 'ERROR'
        };
      }
    } catch (err: any) {
      return {
        status: 'DOWN',
        latency: 0,
        logMessage: `Heartbeat Failure: HTTP GET [${service.name}] failed. Connection timeout or host unreachable. Error: ${err.message}`,
        level: 'ERROR'
      };
    }
  } else {
    return new Promise((resolve) => {

      let host = service.ipAddress;
      let port = service.port || 80;

      try {
        if (service.url.includes('://')) {
          const cleaned = service.url.replace('postgresql://', 'tcp://').replace('redis://', 'tcp://');
          const parsed = new URL(cleaned);
          host = parsed.hostname || host;
          port = parsed.port ? parseInt(parsed.port) : port;
        }
      } catch (err) {}

      const socket = new net.Socket();
      socket.setTimeout(3500);

      socket.connect(port, host, () => {
        const end = performance.now();
        const latency = Math.round((end - start) * 10) / 10;
        socket.destroy();
        resolve({
          status: 'UP',
          latency,
          logMessage: `Heartbeat: TCP Connection [${service.name}] -> ${host}:${port} UP (${latency}ms). Port Open.`,
          level: 'INFO'
        });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({
          status: 'DOWN',
          latency: 0,
          logMessage: `Heartbeat Error: TCP socket connection failed for [${service.name}] on ${host}:${port}. Connection refused.`,
          level: 'ERROR'
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          status: 'DOWN',
          latency: 0,
          logMessage: `Heartbeat Timeout: TCP connection timed out for [${service.name}] on ${host}:${port} (3500ms limit).`,
          level: 'ERROR'
        });
      });
    });
  }
};


const executeHealthCheckForService = async (serviceId: string, isManual = false) => {
  const db = loadDb();
  const serviceIndex = db.services.findIndex(s => s.id === serviceId);
  if (serviceIndex === -1) return;

  const service = db.services[serviceIndex];
  const originalStatus = service.status;
  
  const checkResult = await pingService(service);
  

  const nowTimeString = getTimestamp();
  const newHistoryPoint: LatencyPoint = {
    timestamp: nowTimeString,
    value: checkResult.status === 'UP' ? checkResult.latency : 0,
    status: checkResult.status
  };


  const updatedHistory = [...service.history, newHistoryPoint].slice(-15);


  const upPoints = updatedHistory.filter(p => p.status === 'UP').length;
  const uptime24h = Number(((upPoints / updatedHistory.length) * 100).toFixed(2));


  const updatedService: MonitoredService = {
    ...service,
    status: checkResult.status,
    latency: checkResult.status === 'UP' ? checkResult.latency : 0,
    lastChecked: nowTimeString,
    history: updatedHistory,
    uptime24h
  };

  db.services[serviceIndex] = updatedService;
  saveDb(db);


  const shouldLogSuccess = isManual || Math.random() > 0.8;
  if (checkResult.status !== 'UP' || shouldLogSuccess) {
    const logText = isManual ? `[Manual Check] ${checkResult.logMessage}` : checkResult.logMessage;
    
    // Add log entry directly
    const entry = createLog(checkResult.level, logText, service.id, service.name);
    db.logs.push(entry);
    if (db.logs.length > 100) db.logs.shift();
    saveDb(db);
  }


  if (originalStatus === 'UP' && checkResult.status === 'DOWN') {
    const warnText = `ALERT: Service [${service.name}] has shut down! Health check failed.`;
    const entry = createLog('WARN', warnText, service.id, service.name);
    db.logs.push(entry);
    if (db.logs.length > 100) db.logs.shift();
    saveDb(db);
  } else if (originalStatus === 'DOWN' && checkResult.status === 'UP') {
    const recoveryText = `RECOVERED: Service [${service.name}] is back ONLINE. Response verified in ${checkResult.latency}ms.`;
    const entry = createLog('INFO', recoveryText, service.id, service.name);
    db.logs.push(entry);
    if (db.logs.length > 100) db.logs.shift();
    saveDb(db);
  }

  broadcastUpdate(db);
};

// per-service scheduled ping timers
const activeTimers: Record<string, NodeJS.Timeout> = {};

const startServiceScheduler = (service: MonitoredService) => {
  if (activeTimers[service.id]) {
    clearInterval(activeTimers[service.id]);
  }
  
  // interval is in seconds
  activeTimers[service.id] = setInterval(() => {
    executeHealthCheckForService(service.id);
  }, service.interval * 1000);
};

const initAllSchedulers = () => {
  const db = loadDb();
  db.services.forEach(srv => {
    startServiceScheduler(srv);
  });
  console.log('Background automated health check schedulers initialized successfully.');
};



app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');
  

  sseClients.push(res);
  console.log(`SSE Client connected. Total active streams: ${sseClients.length}`);


  const db = loadDb();
  const actuator = getActuatorMetrics();
  res.write(`data: ${JSON.stringify({ services: db.services, logs: db.logs, actuator })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
    console.log(`SSE Client disconnected. Total active streams: ${sseClients.length}`);
  });
});

app.get('/api/services', (req, res) => {
  const db = loadDb();
  res.json(db.services);
});

app.get('/api/logs', (req, res) => {
  const db = loadDb();
  res.json(db.logs);
});

app.post('/api/services', async (req, res) => {
  const db = loadDb();
  const formData = req.body;

  if (!formData.name || !formData.url || !formData.ipAddress) {
    return res.status(400).json({ error: 'Name, URL, and IP are required fields.' });
  }

  const newId = Math.random().toString(36).substring(2, 11);
  const nowTimeString = getTimestamp();
  

  const baseHistory: LatencyPoint[] = Array.from({ length: 12 }).map((_, i) => ({
    timestamp: new Date(Date.now() - (11 - i) * 2 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false }),
    value: 20 + Math.random() * 20,
    status: 'UP'
  }));

  const newService: MonitoredService = {
    id: newId,
    name: formData.name,
    url: formData.url,
    category: formData.category || 'web',
    status: 'PENDING',
    latency: 0,
    lastChecked: nowTimeString,
    history: baseHistory,
    interval: formData.interval || 60,
    uptime24h: 100.00,
    description: formData.description || 'No description supplied',
    ipAddress: formData.ipAddress,
    port: formData.port ? Number(formData.port) : undefined
  };

  db.services.push(newService);
  saveDb(db);

  addLogEntry('INFO', `Service registered: ${newService.name} (${newService.url})`, newService.id, newService.name);

  startServiceScheduler(newService);


  executeHealthCheckForService(newId, false);

  res.status(201).json(newService);
});

app.put('/api/services/:id', (req, res) => {
  const db = loadDb();
  const { id } = req.params;
  const formData = req.body;

  const serviceIndex = db.services.findIndex(s => s.id === id);
  if (serviceIndex === -1) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  const existing = db.services[serviceIndex];
  const updated: MonitoredService = {
    ...existing,
    name: formData.name || existing.name,
    url: formData.url || existing.url,
    category: formData.category || existing.category,
    interval: formData.interval || existing.interval,
    description: formData.description || existing.description,
    ipAddress: formData.ipAddress || existing.ipAddress,
    port: formData.port !== undefined ? (formData.port ? Number(formData.port) : undefined) : existing.port,
    lastChecked: getTimestamp()
  };

  db.services[serviceIndex] = updated;
  saveDb(db);

  addLogEntry('INFO', `Service updated: ${updated.name}`, updated.id, updated.name);


  startServiceScheduler(updated);

  res.json(updated);
});

app.delete('/api/services/:id', (req, res) => {
  const db = loadDb();
  const { id } = req.params;

  const target = db.services.find(s => s.id === id);
  if (!target) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  db.services = db.services.filter(s => s.id !== id);
  saveDb(db);


  if (activeTimers[id]) {
    clearInterval(activeTimers[id]);
    delete activeTimers[id];
  }

  addLogEntry('WARN', `Service deleted: ${target.name}`);

  res.json({ message: 'Service removed successfully.' });
});

app.post('/api/services/:id/recheck', async (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const service = db.services.find(s => s.id === id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  console.log(`Manual recheck request received for [${service.name}]`);
  

  executeHealthCheckForService(id, true);

  res.json({ message: 'Health check trigger command dispatched.' });
});

app.post('/api/services/recheck', (req, res) => {
  const db = loadDb();
  console.log('Global sweep recheck request received.');
  

  db.services.forEach((srv) => {
    executeHealthCheckForService(srv.id, true);
  });

  res.json({ message: 'Global sweep checks dispatched.' });
});

app.post('/api/services/:id/toggle', (req, res) => {
  const db = loadDb();
  const { id } = req.params;

  const serviceIndex = db.services.findIndex(s => s.id === id);
  if (serviceIndex === -1) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  const srv = db.services[serviceIndex];
  const nextStatus: ServiceStatus = srv.status === 'UP' ? 'DOWN' : 'UP';
  const nextLatency = nextStatus === 'UP' ? 35 : 0;
  const nowTimeString = getTimestamp();

  const updated: MonitoredService = {
    ...srv,
    status: nextStatus,
    latency: nextLatency,
    lastChecked: nowTimeString,
    history: [...srv.history.slice(1), { timestamp: nowTimeString, value: nextLatency, status: nextStatus }]
  };

  db.services[serviceIndex] = updated;
  saveDb(db);

  const level = nextStatus === 'UP' ? 'INFO' : 'ERROR';
  addLogEntry(
    level,
    `Manual toggle: Force health status to ${nextStatus}`,
    srv.id,
    srv.name
  );

  res.json(updated);
});



app.get('/api/actuator/health', (req, res) => {
  const metrics = getActuatorMetrics();
  res.json({
    status: metrics.healthStatus,
    components: {
      db: {
        status: isDbDisrupted ? 'DOWN' : 'UP',
        details: { pool: `${metrics.dbPoolActive}/${metrics.dbPoolMax}` }
      },
      diskSpace: {
        status: 'UP',
        details: { free: `${metrics.diskFree}GB`, total: `${metrics.diskTotal}GB` }
      },
      cpu: {
        status: metrics.cpuUsage > 85 ? 'DEGRADED' : 'UP',
        details: { load: `${metrics.cpuUsage}%` }
      }
    }
  });
});

app.get('/api/actuator/metrics', (req, res) => {
  res.json(getActuatorMetrics());
});

app.post('/api/actuator/simulate/cpu', (req, res) => {
  isCpuSpikeActive = !isCpuSpikeActive;
  
  const level = isCpuSpikeActive ? 'WARN' : 'INFO';
  const msg = isCpuSpikeActive 
    ? 'Simulation: CPU load spike active' 
    : 'Simulation: CPU load restored to normal';
  
  addLogEntry(level, msg);
  res.json({ isCpuSpikeActive });
});

app.post('/api/actuator/simulate/db', (req, res) => {
  isDbDisrupted = !isDbDisrupted;

  const level = isDbDisrupted ? 'ERROR' : 'INFO';
  const msg = isDbDisrupted
    ? 'Simulation: Database pool disrupted'
    : 'Simulation: Database pool restored';

  addLogEntry(level, msg);


  if (isDbDisrupted) {
    const db = loadDb();
    db.services = db.services.map((srv) => {
      if (srv.category !== 'database') return srv;
      
      const nowTime = getTimestamp();
      

      const logEntry = createLog(
        'ERROR',
        `Database check failed: pg-db-prod connection refused`,
        srv.id,
        srv.name
      );
      db.logs.push(logEntry);
      if (db.logs.length > 100) db.logs.shift();

      return {
        ...srv,
        status: 'DOWN',
        latency: 0,
        lastChecked: nowTime,
        history: [...srv.history.slice(1), { timestamp: nowTime, value: 0, status: 'DOWN' }]
      };
    });
    saveDb(db);
    broadcastUpdate(db);
  } else {
    const db = loadDb();
    db.services.forEach((srv) => {
      if (srv.category === 'database') {
        executeHealthCheckForService(srv.id, false);
      }
    });
  }

  res.json({ isDbDisrupted });
});

app.post('/api/actuator/gc', (req, res) => {
  addLogEntry('INFO', 'System GC triggered manually');
  

  isCpuSpikeActive = true;
  broadcastUpdate();

  setTimeout(() => {
    isCpuSpikeActive = false;
    actuatorHeapBase = 112;
    addLogEntry('INFO', 'System GC complete: heap reclaimed');
  }, 1000);

  res.json({ message: 'System.gc() execution dispatched.' });
});

app.post('/api/actuator/simulate/reset', (req, res) => {
  isCpuSpikeActive = false;
  isDbDisrupted = false;
  actuatorHeapBase = 245;

  addLogEntry('INFO', 'Simulator: Resetted all simulated disruptions');
  

  const db = loadDb();
  db.services.forEach((srv) => {
    if (srv.category === 'database') {
      executeHealthCheckForService(srv.id, false);
    }
  });

  res.json({ message: 'All interventions reset successfully.' });
});

// serve built frontend if dist/ exists
const DIST_DIR = path.join(__dirname, 'dist');
if (fs.existsSync(DIST_DIR)) {
  console.log('Production folder "dist" detected. Serving static dashboard.');
  app.use(express.static(DIST_DIR));
  
  app.get('*', (req, res, next) => {

    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  console.log('Production "dist" folder not found. API server listening only. Run Vite dev server for frontend.');
}


initAllSchedulers();


process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const server = app.listen(PORT, () => {
  console.log(`Centralized Monitoring Command Center API listening on http://localhost:${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill the existing process or change PORT in .env`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
