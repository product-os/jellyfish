import errio from 'errio';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger, LogContext } from '@balena/jellyfish-logger';
import type { Worker } from '@balena/jellyfish-worker';
import type { Producer } from '@balena/jellyfish-queue';
import type { SessionContract } from '@balena/jellyfish-types/build/core';

const logger = getLogger(__filename);

export const getRedirectUrl = (provider) => {
	return `${environment.oauth.redirectBaseUrl}/oauth/${provider}`;
};

export const getAuthorizeUrl = (provider, userSlug, options) => {
	return options.sync.getAssociateUrl(
		provider,
		environment.integration[provider],
		userSlug,
		{
			origin: getRedirectUrl(provider),
		},
	);
};

export const whoami = (
	context,
	worker: Worker,
	session,
	provider,
	credentials,
	options,
) => {
	return options.sync.whoami(
		{
			getElementBySlug: (slug) => {
				return worker.kernel.getCardBySlug(context, session, slug);
			},
		},
		provider,
		credentials,
	);
};

export const match = (
	context,
	worker: Worker,
	session,
	provider,
	externalUser,
	options,
) => {
	return options.sync.match(
		{
			getElementBySlug: (slug) => {
				return worker.kernel.getCardBySlug(context, session, slug);
			},
		},
		provider,
		externalUser,
		_.omit(options, ['sync']),
	);
};

export const sync = async (
	logContext: LogContext,
	worker: Worker,
	queue,
	session,
	provider,
	externalUser,
	options,
) => {
	const event = await worker.kernel.insertContract(logContext, session, {
		type: 'external-event@1.0.0',
		slug: `external-event-${uuid()}`,
		version: '1.0.0',
		data: await options.sync.getExternalUserSyncEventData(
			{},
			provider,
			externalUser,
		),
	});

	const data = await worker.pre(session, {
		action: 'action-integration-import-event@1.0.0',
		logContext,
		card: event.id,
		type: event.type,
		arguments: {},
	});

	const actionRequest = await queue.enqueue(worker.getId(), session, data);

	const results = await queue.waitResults(logContext, actionRequest);

	if (results.error) {
		throw errio.fromObject(results.data);
	}
};

export const authorize = async (
	logContext: LogContext,
	worker: Worker,
	producer: Producer,
	session,
	provider,
	options,
) => {
	logger.info(logContext, 'OAuth authorization', {
		ip: options.ip,
		provider,
		code: options.code,
	});

	const sessionContract = await worker.kernel.getContractById<SessionContract>(
		logContext,
		session,
		session,
	);

	const data = await worker.pre(session, {
		action: 'action-oauth-authorize@1.0.0',
		logContext,
		card: sessionContract!.data.actor,
		type: 'user@1.0.0',
		arguments: {
			provider,
			code: options.code,
			origin: getRedirectUrl(provider),
		},
	});

	const actionRequest = await producer.enqueue(worker.getId(), session, data);

	const results = await producer.waitResults(logContext, actionRequest);

	if (results.error) {
		throw errio.fromObject(results.data);
	}

	return results.data;
};

export const associate = async (
	logContext: LogContext,
	worker: Worker,
	producer: Producer,
	session,
	provider,
	user,
	credentials,
	options,
) => {
	logger.info(logContext, 'OAuth association', {
		ip: options.ip,
		provider,
		user: user.id,
	});

	const data = await worker.pre(session, {
		action: 'action-oauth-associate@1.0.0',
		logContext,
		card: user.id,
		type: 'user',
		arguments: {
			provider,
			credentials,
		},
	});

	const actionRequest = await producer.enqueue(worker.getId(), session, data);

	const results = await producer.waitResults(logContext, actionRequest);

	if (results.error) {
		throw errio.fromObject(results.data);
	}

	return results.data;
};
