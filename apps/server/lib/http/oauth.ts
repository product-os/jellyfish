import errio from 'errio';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger } from '@balena/jellyfish-logger';

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
	worker,
	session,
	provider,
	credentials,
	options,
) => {
	return options.sync.whoami(
		{
			getElementBySlug: (slug) => {
				return worker.jellyfish.getCardBySlug(context, session, slug);
			},
		},
		provider,
		credentials,
	);
};

export const match = (
	context,
	worker,
	session,
	provider,
	externalUser,
	options,
) => {
	return options.sync.match(
		{
			getElementBySlug: (slug) => {
				return worker.jellyfish.getCardBySlug(context, session, slug);
			},
		},
		provider,
		externalUser,
		_.omit(options, ['sync']),
	);
};

export const sync = async (
	context,
	worker,
	queue,
	session,
	provider,
	externalUser,
	options,
) => {
	const event = await worker.jellyfish.insertCard(context, session, {
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
		context,
		card: event.id,
		type: event.type,
		arguments: {},
	});

	const actionRequest = await queue.enqueue(worker.getId(), session, data);

	const results = await queue.waitResults(context, actionRequest);

	if (results.error) {
		throw errio.fromObject(results.data);
	}
};

export const authorize = async (
	context,
	worker,
	queue,
	session,
	provider,
	options,
) => {
	logger.info(context, 'OAuth authorization', {
		ip: options.ip,
		provider,
		code: options.code,
	});

	const sessionCard = await worker.jellyfish.getCardById(
		context,
		session,
		session,
	);

	const data = await worker.pre(session, {
		action: 'action-oauth-authorize@1.0.0',
		context,
		card: sessionCard.data.actor,
		type: 'user@1.0.0',
		arguments: {
			provider,
			code: options.code,
			origin: getRedirectUrl(provider),
		},
	});

	const actionRequest = await queue.enqueue(worker.getId(), session, data);

	const results = await queue.waitResults(context, actionRequest);

	if (results.error) {
		throw errio.fromObject(results.data);
	}

	return results.data;
};

export const associate = async (
	context,
	worker,
	queue,
	session,
	provider,
	user,
	credentials,
	options,
) => {
	logger.info(context, 'OAuth association', {
		ip: options.ip,
		provider,
		user: user.id,
	});

	const data = await worker.pre(session, {
		action: 'action-oauth-associate@1.0.0',
		context,
		card: user.id,
		type: 'user',
		arguments: {
			provider,
			credentials,
		},
	});

	const actionRequest = await queue.enqueue(worker.getId(), session, data);

	const results = await queue.waitResults(context, actionRequest);

	if (results.error) {
		throw errio.fromObject(results.data);
	}

	return results.data;
};
