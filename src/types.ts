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
  uptime24h: number; // uptime percent e.g., 99.95
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
  cpuUsage: number; // percentage
  heapUsed: number; // MB
  heapMax: number; // MB
  diskFree: number; // GB
  diskTotal: number; // GB
  dbPoolActive: number;
  dbPoolMax: number;
  threadCount: number;
  healthStatus: 'UP' | 'DOWN' | 'DEGRADED';
}
