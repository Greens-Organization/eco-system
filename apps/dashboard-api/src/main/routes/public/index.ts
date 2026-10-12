import { Hono } from 'hono';
import { timing } from 'hono/timing';
import { CONSTANTS } from '@/infra/common/constants';
import { auth } from './auth';
import { ready } from './ready';
import { status } from './status';

export const publicRoute = new Hono();

publicRoute.use('*', timing());

publicRoute.route(CONSTANTS.API_STATUS_ENDPOINT, status);
publicRoute.route(CONSTANTS.API_READY_ENDPOINT, ready);
publicRoute.route(CONSTANTS.API_AUTH_ENDPOINT, auth);
