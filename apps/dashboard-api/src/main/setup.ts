import { log } from '@pack/observability/logger';
import { env, isLocal } from '#core/env';
import { CONSTANTS } from '#infra/common/constants';

export const setup = {
  logInfo: () => {
    const host = isLocal ? 'localhost' : env.HOST;
    log.info('🔥 REST API endpoint is {url}', {
      url: `http://${host}:${env.PORT}${CONSTANTS.API_REST_V1}`,
    });
    log.info('❤️  Liveness {liveness} · Readiness {readiness}', {
      liveness: `http://localhost:${env.PORT}${CONSTANTS.API_STATUS_ENDPOINT}`,
      readiness: CONSTANTS.API_READY_ENDPOINT,
    });
  },
};
