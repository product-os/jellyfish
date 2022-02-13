import type { Kernel } from '@balena/jellyfish-core';
import type { LogContext } from '@balena/jellyfish-logger';
import type { SessionContract } from '@balena/jellyfish-types/build/core';
import bcrypt from 'bcrypt';
import _ from 'lodash';

const isValidToken = async (
	logContext: LogContext,
	kernel: Kernel,
	session: string,
	sessionToken: string = '',
): Promise<boolean> => {
	try {
		const card = await kernel.getContractById<SessionContract>(
			logContext,
			kernel.adminSession()!,
			session,
		);
		if (!card || !card.data.token?.authentication) {
			throw new Error('Session not found');
		}
		const pass = await bcrypt.compare(
			sessionToken,
			card.data.token.authentication,
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
		const card = await kernel.getContractById<SessionContract>(
			logContext,
			kernel.adminSession()!,
			session,
		);
		if (!card) {
			return false;
		}
		return true;
	} catch (e) {
		return false;
	}
};

export const authMiddleware =
	(kernel: Kernel, options: { guestSession: string }) =>
	async (request, _response, next) => {
		request.session = options.guestSession;

		const authorizationHeader = request.headers['authorization'];

		if (!authorizationHeader) {
			return next();
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
		return next();
	};
