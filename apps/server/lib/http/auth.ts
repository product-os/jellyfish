import type { LogContext } from '@balena/jellyfish-logger';
import type { SessionContract } from '@balena/jellyfish-types/build/core';
import type { Kernel } from 'autumndb';
import bcrypt from 'bcrypt';
import _ from 'lodash';

const isValidToken = async (
	logContext: LogContext,
	kernel: Kernel,
	session: string,
	sessionToken: string = '',
): Promise<boolean> => {
	try {
		const contract = await kernel.getContractById<SessionContract>(
			logContext,
			kernel.adminSession()!,
			session,
		);
		if (!contract || !contract.data.token?.authentication) {
			throw new Error('Session not found');
		}
		const pass = await bcrypt.compare(
			sessionToken,
			contract.data.token.authentication,
		);
		return !!pass;
	} catch (e) {
		return false;
	}
};

const isValidSession = async (
	logContext: LogContext,
	kernel: Kernel,
	session: string,
): Promise<boolean> => {
	try {
		const contract = await kernel.getContractById<SessionContract>(
			logContext,
			kernel.adminSession()!,
			session,
		);
		if (!contract) {
			return false;
		}
		return true;
	} catch (e) {
		return false;
	}
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

		// Split 'Bearer ' and <session_id>.<auth_token>
		const authorizationHeaderValue = _.last(_.split(authorizationHeader, ' '));

		// Split session ID and auth token
		const credentials = _.split(authorizationHeaderValue, '.');

		if (credentials.length === 2) {
			const sessionIsValid = await isValidToken(
				request.context,
				kernel,
				credentials[0],
				credentials[1],
			);
			if (sessionIsValid) {
				request.session = credentials[0];
			}
		} else if (credentials.length === 1) {
			const sessionIsValid = await isValidSession(
				request.context,
				kernel,
				credentials[0],
			);
			if (sessionIsValid) {
				request.session = credentials[0];
			}
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
