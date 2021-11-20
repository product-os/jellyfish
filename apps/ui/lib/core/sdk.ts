import { getSdk } from '@balena/jellyfish-client-sdk';
import * as environment from '../environment';

export const sdk = getSdk({
	apiPrefix: environment.api.prefix,
	apiUrl: environment.api.url,
});
