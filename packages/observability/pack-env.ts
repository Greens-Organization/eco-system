import { z } from 'zod';

const booleanSchema = z.stringbool({
  truthy: ['yes', 'true'],
  falsy: ['no', 'false'],
});

export const schema = z.object({
  FILE_LOG: booleanSchema.default(false),
  LOG_PRETTY: booleanSchema.optional(),
  LOG_LEVEL: z.string().min(1).default('info'),
  // VERBOSE=true → debug level + (in the API) per-request access logs.
  VERBOSE: booleanSchema.default(false),

  // Structured-log base fields (logger `base`). All optional/defaulted so the
  // schema parses with no env set; each app overrides SERVICE_NAME via env.
  SERVICE_NAME: z.string().default('eco-system'),
  SERVICE_VERSION: z.string().default('0.0.0'),
  DEPLOYMENT_ENV: z.string().optional(),
  REGION: z.string().optional(),
  HOSTNAME: z.string().optional(),

  // Observability exporters — absent = no-op (default off).
  SENTRY_DSN: z.string().optional(),
  // Accepts a URL or empty string (empty = off) — env files use `KEY=` empty.
  OTEL_EXPORTER_OTLP_ENDPOINT: z.union([z.url(), z.literal('')]).optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_METRIC_EXPORT_INTERVAL: z.coerce
    .number()
    .int()
    .positive()
    .default(60000),
});

export const env = schema.parse(process.env);
