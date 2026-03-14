import { Hono } from 'hono';
import { timing } from 'hono/timing';
import { CONSTANTS } from '@/infra/common/constants';
import { auth } from './auth';
import { health } from './health';

export const publicRoute = new Hono();

publicRoute.use('*', timing());

publicRoute.route(`${CONSTANTS.API_HEALTH_ENDPOINT}`, health);
publicRoute.route(`${CONSTANTS.API_AUTH_ENDPOINT}`, auth);
