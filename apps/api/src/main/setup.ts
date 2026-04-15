import { log } from '@pack/observability/logger';
import { env, isLocal } from '@/core/env';
import { CONSTANTS } from '@/infra/common/constants';

export const setup = {
  timezone: () => {
    log.info('Need to setup timezone');
  },
  logInfo: () => {
    log.info(
      `🔥 REST API endpoint is http://${isLocal ? 'localhost' : env.HOST}:${env.PORT}${CONSTANTS.API_REST_V1}`
    );

    log.info(
      `❤️  Verify the health route at http://localhost:${env.PORT}${CONSTANTS.API_HEALTH_ENDPOINT}`
    );
  },
};
