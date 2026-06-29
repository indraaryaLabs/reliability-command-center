import { LogEntry } from '../types';

export const makeLog = (
  level: 'INFO' | 'WARN' | 'ERROR',
  message: string,
  serviceId?: string,
  serviceName?: string
): LogEntry => {
  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-US', { hour12: false }) + 
    '.' + 
    String(now.getMilliseconds()).padStart(3, '0');

  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp,
    serviceId,
    serviceName,
    level,
    message,
  };
};

export const getInitialLogs = (): LogEntry[] => {
  return [
    makeLog('INFO', 'Initializing health check service...'),
    makeLog('INFO', 'Loaded service inventory with 7 monitored endpoints.'),
    makeLog('INFO', 'Database connection pool initialized: Status: UP'),
    makeLog('INFO', 'Starting health check scheduler...'),
    makeLog('INFO', 'Ping: [Auth-Broker Service] -> 10.0.4.15:443 UP (34.2ms)'),
    makeLog('INFO', 'Ping: [Primary PostgreSQL Cluster] -> 10.0.12.8:5432 UP (5.8ms)'),
    makeLog('INFO', 'Ping: [Stripe Payments REST Gateway] -> 18.204.9.45:443 UP (184.5ms)'),
    makeLog('INFO', 'Ping: [Core System API Broker] -> 10.0.2.1:8080 UP (22.1ms)'),
    makeLog('INFO', 'Ping: [Customer Support Engagement Portal] -> 10.0.10.100:443 UP (82.4ms)'),
    makeLog('INFO', 'Ping: [Redis In-Memory Session Cache] -> 10.0.8.22:6379 UP (1.8ms)'),
    makeLog('ERROR', 'Ping: [S3 Invoice Document Vault] -> Connection timeout on port 80.'),
    makeLog('WARN', 'Service [S3 Invoice Document Vault] is DOWN. Raising alert!'),
    makeLog('INFO', 'Dashboard backend server started successfully.'),
  ];
};
