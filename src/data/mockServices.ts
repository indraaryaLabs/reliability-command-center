import { MonitoredService, ServiceCategory, LatencyPoint } from '../types';


const generateHistory = (
  baseLatency: number,
  variance: number,
  category: ServiceCategory,
  initialStatus: 'UP' | 'DOWN'
): LatencyPoint[] => {
  const history: LatencyPoint[] = [];
  const now = new Date();


  for (let i = 11; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 2 * 60 * 1000);
    const timeString = time.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    let status = initialStatus;
    let val = 0;

    if (initialStatus === 'DOWN') {
      if (i > 5) {
        status = 'UP';
        val = baseLatency + (Math.random() * variance * 2 - variance);
      } else {
        status = 'DOWN';
        val = 0;
      }
    } else {

      const isSpike = Math.random() > 0.85;
      val = isSpike
        ? baseLatency + variance * 3 + Math.random() * 50
        : baseLatency + (Math.random() * variance * 2 - variance);
      

      if (category === 'cache' && val < 1) val = 1.2;
      if (val < 1) val = 1;
    }

    history.push({
      timestamp: timeString,
      value: Math.round(val * 10) / 10,
      status,
    });
  }

  return history;
};

export const INITIAL_SERVICES: MonitoredService[] = [
  {
    id: '1',
    name: 'Auth-Broker Service',
    url: 'https://auth.internal.corp',
    category: 'auth',
    status: 'UP',
    latency: 34.2,
    lastChecked: new Date().toLocaleTimeString('en-US', { hour12: false }),
    history: generateHistory(32, 6, 'auth', 'UP'),
    interval: 30,
    uptime24h: 99.98,
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
    lastChecked: new Date().toLocaleTimeString('en-US', { hour12: false }),
    history: generateHistory(6, 1.5, 'database', 'UP'),
    interval: 60,
    uptime24h: 99.99,
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
    lastChecked: new Date().toLocaleTimeString('en-US', { hour12: false }),
    history: generateHistory(175, 25, 'api', 'UP'),
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
    lastChecked: new Date().toLocaleTimeString('en-US', { hour12: false }),
    history: generateHistory(20, 4, 'api', 'UP'),
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
    lastChecked: new Date().toLocaleTimeString('en-US', { hour12: false }),
    history: generateHistory(78, 12, 'web', 'UP'),
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
    lastChecked: new Date().toLocaleTimeString('en-US', { hour12: false }),
    history: generateHistory(1.5, 0.4, 'cache', 'UP'),
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
    lastChecked: new Date().toLocaleTimeString('en-US', { hour12: false }),
    history: generateHistory(45, 8, 'infra', 'DOWN'),
    interval: 60,
    uptime24h: 98.15,
    description: 'AWS S3 bucket storing PDF invoices and profile attachments.',
    ipAddress: '52.216.12.89',
    port: 80,
  },
];
