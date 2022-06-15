import type { LogContext } from '@balena/jellyfish-logger';
import * as assert from '@balena/jellyfish-assert';
import bcrypt from 'bcrypt';
import _ from 'lodash';
import type { AutumnDBSession, SessionContract, Kernel } from 'autumndb';
import { errors } from 'autumndb';

const getAndAssertSessionContract = async (
	logContext: LogContext,
	kernel: Kernel,
	session: string,
): Promise<SessionContract> => {
	const contract = await kernel.getContractById<SessionContract>(
		logContext,
		kernel.adminSession()!,
		session,
	);

	if (!contract) {
		throw new Error('Session not found');
	}

	// Don't allow inactive sessions to be used
	assert.USER(
		logContext,
		contract.active,
		errors.JellyfishInvalidSession,
		`Invalid session ID: ${session}`,
	);

	// Don't allow expired sessions to be used
	assert.USER(
		logContext,
		!contract.data.expiration ||
			new Date() <= new Date(contract.data.expiration),
		errors.JellyfishSessionExpired,
		`Session expired at: ${contract.data.expiration}`,
	);

	return contract;
};

export const getSession = async (
	logContext: LogContext,
	kernel: Kernel,
	session: string,
	sessionToken: string = '',
): Promise<AutumnDBSession> => {
	const contract = await getAndAssertSessionContract(
		logContext,
		kernel,
		session,
	);

	if (!contract.data.token?.authentication) {
		throw new Error('Session not found');
	}

	const [pass, actor] = await Promise.all([
		bcrypt.compare(sessionToken, contract.data.token.authentication),
		kernel.getContractById(
			logContext,
			kernel.adminSession()!,
			contract.data.actor,
		),
	]);

	if (!pass || !actor) {
		throw new Error('Session invalid');
	}

	return {
		actor,
		scope: contract.data.scope,
	};
};

// TODO: Drop handling of legacy session tokens once
// https://github.com/product-os/jellyfish-client-sdk/pull/511 is merged
export const getSessionLegacy = async (
	logContext: LogContext,
	kernel: Kernel,
	session: string,
): Promise<AutumnDBSession> => {
	const contract = await getAndAssertSessionContract(
		logContext,
		kernel,
		session,
	);

	const actor = await kernel.getContractById(
		logContext,
		kernel.adminSession()!,
		contract.data.actor,
	);

	if (!actor) {
		throw new Error('Session invalid');
	}
	return {
		actor,
		scope: contract.data.scope,
	};
};

export const getSessionFromToken = async (
	logContext: LogContext,
	kernel: Kernel,
	token: string,
): Promise<AutumnDBSession> => {
	// Split session ID and auth token
	const credentials = _.split(token, '.');

	if (credentials.length === 2) {
		// if we find two parts, then the token is in the form <session_id>.<auth_token>
		const session = await getSession(
			logContext,
			kernel,
			credentials[0],
			credentials[1],
		);
		return session;
	} else if (credentials.length === 1) {
		// if there is only one part, then the token is in the form <session_id>
		// and the session id itself is the auth token
		const session = await getSessionLegacy(logContext, kernel, credentials[0]);
		return session;
	}

	// If it's not captured by the checks above, the token is invalid
	throw new Error('Invalid token');
};

export const authMiddleware =
	(kernel: Kernel) => async (request, response, next) => {
		const authorizationHeader = request.headers['authorization'];
		if (!authorizationHeader) {
			return response.status(401).json({
				error: true,
				data: 'Invalid session',
			});
		}

		try {
			// Split 'Bearer ' and <session_id>.<auth_token>
			const authorizationHeaderValue = _.last(
				_.split(authorizationHeader, ' '),
			);

			if (!authorizationHeaderValue) {
				throw new Error('Invalid token');
			}

			request.session = await getSessionFromToken(
				request.context,
				kernel,
				authorizationHeaderValue,
			);
		} catch (e) {
			return response
				.status(401)
				.json({ error: true, data: 'Invalid session' });
		}

		// If a session was successfully retrieved, continue the request
		// Otherwise, reject the request
		if (request.session) {
			return next();
		} else {
			return response.status(401).json({
				error: true,
				data: 'Invalid session',
			});
		}
	};
