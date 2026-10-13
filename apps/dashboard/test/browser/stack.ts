// The stack the browser tests run against: the test compose (Postgres, Redis,
// Mailpit), the API and the dashboard's production build. Ports stay clear of
// the dev servers (3000/3002) so both can run at once; the compose cannot run
// alongside the API e2e suite (same host ports).

export const DASHBOARD_PORT = 3030;
export const API_PORT = 3032;
export const DASHBOARD = `http://localhost:${DASHBOARD_PORT}`;
export const API = `http://127.0.0.1:${API_PORT}`;
export const MAILPIT = 'http://localhost:8025/api/v1';

const BETTER_AUTH_SECRET = 'browser-test-secret-not-for-prod-0123456789';
const CLIENT_IP_SECRET = 'browser-test-client-ip-secret-not-for-prod-0123';

export const DATABASE_URL =
  'postgresql://eco_user:eco_password@localhost:5436/eco_test';

/** The API reads .env from its folder too: everything that matters is set. */
export const apiEnv = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: String(API_PORT),
  DATABASE_URL,
  REDIS_URL: 'redis://localhost:6380',
  BETTER_AUTH_SECRET,
  CLIENT_IP_SECRET,
  BETTER_AUTH_URL: DASHBOARD,
  ORIGIN_ALLOWED: DASHBOARD,
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  SMTP_USER: '',
  SMTP_PASS: '',
  SMTP_FROM: 'test@eco.local',
  SENTRY_DSN: '',
  OTEL_EXPORTER_OTLP_ENDPOINT: '',
  LOG_PRETTY: 'false',
};

export const dashboardEnv = {
  NODE_ENV: 'production',
  PORT: String(DASHBOARD_PORT),
  ORIGIN: DASHBOARD,
  API_URL: API,
  BETTER_AUTH_SECRET,
  CLIENT_IP_SECRET,
  // Each test sends its own client IP, so the per-IP sign-in limit (3 / 10 s)
  // holds per test instead of across the whole suite.
  ADDRESS_HEADER: 'x-forwarded-for',
  XFF_DEPTH: '1',
  LOG_PRETTY: 'false',
};
