import { getLogger, LogContext } from '@balena/jellyfish-logger';
import type {
	ActionRequestContract,
	Sync,
	Worker,
} from '@balena/jellyfish-worker';
import { strict as assert } from 'assert';
import type { AutumnDBSession } from 'autumndb';
import errio from 'errio';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';

const logger = getLogger(__filename);

export const whoami = (
	logContext: LogContext,
	worker: Worker,
	session: AutumnDBSession,
	provider: string,
	credentials,
	options: { sync: Sync },
) => {
	return options.sync.whoami(
		// TS-TODO: this is not a proper `SyncActionContext`
		{
			getElementBySlug: (slug) => {
				return worker.kernel.getContractBySlug(logContext, session, slug);
			},
		} as any,
		provider,
		credentials,
	);
};

export const match = (
	logContext: LogContext,
	worker: Worker,
	session: AutumnDBSession,
	provider: string,
	externalUser,
	options: { slug: string; sync: Sync },
) => {
	return options.sync.match(
		// TS-TODO: this is not a proper `SyncActionContext`
		{
			getElementBySlug: (slug) => {
				return worker.kernel.getContractBySlug(logContext, session, slug);
			},
		} as any,
		provider,
		externalUser,
		_.omit(options, ['sync']),
	);
};

export const sync = async (
	logContext: LogContext,
	worker: Worker,
	session: AutumnDBSession,
	provider: string,
	externalUser,
	options: { sync: Sync },
) => {
	const event = await worker.kernel.insertContract(logContext, session, {
		type: 'external-event@1.0.0',
		slug: `external-event-${uuid()}`,
		version: '1.0.0',
		data: await options.sync.getExternalUserSyncEventData(
			logContext,
			provider,
			externalUser,
		),
	});

	const preResults = await worker.pre(session, {
		action: 'action-integration-import-event@1.0.0',
		logContext,
		card: event.id,
		type: event.type,
		arguments: {},
	});

	const actionRequestDate = new Date();
	const actionRequest = await worker.insertCard<ActionRequestContract>(
		logContext,
		session,
		worker.typeContracts['action-request@1.0.0'],
		{
			attachEvents: false,
			timestamp: new Date().toISOString(),
		},
		{
			type: 'action-request@1.0.0',
			data: {
				...preResults,
				context: logContext,
				epoch: actionRequestDate.valueOf(),
				timestamp: actionRequestDate.toISOString(),
				actor: session.actor.id,
				input: {
					id: event.id,
				},
			},
		},
	);
	assert(actionRequest);

	const results = await worker.producer.waitResults(logContext, actionRequest);

	if (results.error) {
		throw errio.fromObject(results.data);
	}
};

export const authorize = async (
	logContext: LogContext,
	worker: Worker,
	session: AutumnDBSession,
	provider: string,
	options,
) => {
	logger.debug(logContext, 'OAuth authorization', {
		ip: options.ip,
		provider,
		code: options.code,
	});

	const preResults = await worker.pre(session, {
		action: 'action-oauth-authorize@1.0.0',
		logContext,
		card: session.actor.id,
		type: 'user@1.0.0',
		arguments: {
			provider,
			code: options.code,
		},
	});

	const actionRequestDate = new Date();
	const actionRequest = await worker.insertCard<ActionRequestContract>(
		logContext,
		session,
		worker.typeContracts['action-request@1.0.0'],
		{
			attachEvents: false,
			timestamp: new Date().toISOString(),
		},
		{
			type: 'action-request@1.0.0',
			data: {
				...preResults,
				context: logContext,
				epoch: actionRequestDate.valueOf(),
				timestamp: actionRequestDate.toISOString(),
				actor: session.actor.id,
				input: {
					id: session.actor.id,
				},
			},
		},
	);
	assert(actionRequest);

	const results = await worker.producer.waitResults(logContext, actionRequest);

	if (results.error) {
		throw errio.fromObject(results.data);
	}

	return results.data;
};

export const associate = async (
	logContext: LogContext,
	worker: Worker,
	session: AutumnDBSession,
	provider: string,
	user,
	credentials,
	options,
) => {
	logger.debug(logContext, 'OAuth association', {
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

	const actionRequestDate = new Date();
	const actionRequest = await worker.insertCard<ActionRequestContract>(
		logContext,
		session,
		worker.typeContracts['action-request@1.0.0'],
		{
			attachEvents: false,
			timestamp: new Date().toISOString(),
		},
		{
			type: 'action-request@1.0.0',
			data: {
				...data,
				context: logContext,
				epoch: actionRequestDate.valueOf(),
				timestamp: actionRequestDate.toISOString(),
				actor: session.actor.id,
				input: {
					id: user.id,
				},
			},
		},
	);
	assert(actionRequest);

	const results = await worker.producer.waitResults(logContext, actionRequest);

	if (results.error) {
		throw errio.fromObject(results.data);
	}

	return results.data;
};
