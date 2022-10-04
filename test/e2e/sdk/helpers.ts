import { getSdk, JellyfishSDK } from '@balena/jellyfish-client-sdk';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import type { Contract, JsonSchema } from 'autumndb';
import { setTimeout as delay } from 'timers/promises';

export function initSdk(): JellyfishSDK {
  return getSdk({
		apiPrefix: 'api/v2',
		apiUrl: `${environment.http.host}:${environment.http.port}`,
	});
}

export async function login(sdk: JellyfishSDK): Promise<void> {
	const session = await sdk.auth.login({
		username: environment.test.user.username,
		password: environment.test.user.password,
	});
	sdk.setAuthToken(session.id);
};

export async function waitForMatch(sdk: JellyfishSDK, query: JsonSchema, times = 40): Promise<Contract> {
	if (times === 0) {
		throw new Error('The wait query did not resolve');
	}

	const results = await sdk.query(query);

	if (results.length > 0) {
		return results[0];
	}
    await delay(1000);
	return exports.waitForMatch(sdk, query, times - 1);
};

export async function executeThenWait(sdk: JellyfishSDK, asyncFn: () => Promise<any>, waitQuery: JsonSchema): Promise<Contract> {
	if (asyncFn) {
		await asyncFn();
	}

	return waitForMatch(sdk, waitQuery);
};

export function teardown(sdk: JellyfishSDK): void {
	sdk.cancelAllStreams();
	sdk.cancelAllRequests();
};
