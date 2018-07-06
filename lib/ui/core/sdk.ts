import { getSdk } from '@resin.io/jellyfish-sdk';

const API_PREFIX = process.env.API_PREFIX || 'api/v2';
const API_URL = process.env.API_URL || window.location.origin;

export const sdk = getSdk({
	apiPrefix: API_PREFIX,
	apiUrl: API_URL,
});

