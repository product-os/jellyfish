import {
	Context,
	JellyfishKernel,
	SessionContract,
} from '@balena/jellyfish-types/build/core';
import bcrypt from 'bcrypt';
import _ from 'lodash';

const isValidToken = async (
	context: Context,
	jellyfish: JellyfishKernel,
	session: string,
	sessionToken: string = '',
): Promise<boolean> => {
	try {
		const card = await jellyfish.getCardById<SessionContract>(
			context,
			jellyfish.sessions!.admin,
			session,
		);
		return bcrypt.compare(sessionToken, card!.data.token!.authentication);
	} catch (e) {
		return false;
	}
};

const isValidSession = async (
	context: Context,
	jellyfish: JellyfishKernel,
	session: string,
): Promise<boolean> => {
	try {
		const card = await jellyfish.getCardById<SessionContract>(
			context,
			jellyfish.sessions!.admin,
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
	(jellyfish: JellyfishKernel, options: { guestSession: string }) =>
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
				jellyfish,
				credentials[0],
				credentials[1],
			);
			if (sessionIsValid) {
				request.session = credentials[0];
			}
		} else if (credentials.length === 1) {
			const sessionIsValid = await isValidSession(
				request.context,
				jellyfish,
				credentials[0],
			);
			if (sessionIsValid) {
				request.session = credentials[0];
			}
		}
		return next();
	};
