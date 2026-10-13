// Probe for instrumentation.test.ts. Imports the side-effectful instrumentation
// module under an env controlled by the parent (Bun.spawn), captures the
// observable global-provider state, then force-exits (HostMetrics keeps a timer
// alive otherwise). Not a test file — excluded by the *.test.ts glob.
import { metrics } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { shutdownObservability } from '../../src/instrumentation';

const meterProvider = metrics.getMeterProvider().constructor.name;
const loggerProvider = logs.getLoggerProvider().constructor.name;

let shutdownOk = true;
try {
  // shutdownObservability is best-effort and never rejects; the race only
  // guards against an exporter flush hanging on an unreachable endpoint.
  await Promise.race([shutdownObservability(), Bun.sleep(5000)]);
} catch {
  shutdownOk = false;
}

console.log(JSON.stringify({ meterProvider, loggerProvider, shutdownOk }));
process.exit(0);
