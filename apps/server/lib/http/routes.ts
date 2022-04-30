import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import { getLogger } from '@balena/jellyfish-logger';
import * as metrics from '@balena/jellyfish-metrics';
import type { SessionContract } from '@balena/jellyfish-types/build/core';
import type {
	ActionRequestContract,
	Sync,
	Worker,
} from '@balena/jellyfish-worker';
import { strict } from 'assert';
import type { Kernel } from 'autumndb';
import Bluebird from 'bluebird';
import errio from 'errio';
import _ from 'lodash';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as facades from './facades';
import { Storage } from './file-storage';
import * as oauth from './oauth';
import * as registry from './registry';

// Avoid including package.json in the build output!
// tslint:disable-next-line: no-var-requires
const packageJSON = require('../../../../package.json');

const logger = getLogger(__filename);
const fileStore = new Storage();
const upload = multer({
	storage: multer.memoryStorage(),
});

const sendHTTPError = (request, response, error) => {
	// If the error is expected, respond with error information
	if (error.expected) {
		const errorObject = errio.toObject(error, {
			stack: false,
			exclude: ['expected'],
		});

		logger.info(request.context, 'HTTP expected error', {
			ip: request.ip,
			error: errorObject,
		});

		return response.status(400).json({
			error: true,
			data: errorObject,
		});
	}

	// Otherwise, log the error and respond with generic InternalServerError
	if (_.isError(error)) {
		logger.exception(request.context, 'HTTP unexpected error', error);
	} else {
		// Add more debugging information in case we pass an invalid object
		// to `errio` (which doesn't handle other data very well).
		logger.error(request.context, 'Invalid error object', {
			ip: request.ip,
			error,
		});
	}

	return response.status(500).json({
		error: true,
		data: {
			name: 'InternalServerError',
			message: 'Internal Server Error',
		},
	});
};

export const attachRoutes = (
	application,
	kernel: Kernel,
	worker: Worker,
	options: { sync: Sync; guestSession: string },
) => {
	const queryFacade = new facades.QueryFacade(kernel);
	const authFacade = new facades.AuthFacade(kernel);
	const actionFacade = new facades.ActionFacade(worker, fileStore);
	const viewFacade = new facades.ViewFacade(kernel, queryFacade);

	application.get('/api/v2/config', (_request, response) => {
		response.send({
			codename: packageJSON.codename,
			version: packageJSON.version,
		});
	});

	/*
	 * This endpoint should very simple and should not
	 * communicate with the API by design.
	 * The idea is that this endpoint checks the container
	 * health and that only, as otherwise we are
	 * side-checking the database health, and get restarted
	 * even if the database and not the container is the
	 * problem.
	 */
	application.get('/health', (_request, response) => {
		return response.status(200).end();
	});

	application.get('/status', (request, response) => {
		return Bluebird.props({
			kernel: kernel.getStatus(),
		})
			.then((status) => {
				return response.status(200).json(status);
			})
			.catch((error) => {
				const errorObject = errio.toObject(error, {
					stack: true,
				});

				logger.exception(request.context, 'Status error', error);
				return response.status(500).json({
					error: true,
					data: errorObject,
				});
			});
	});

	application.get('/ping', (request, response) => {
		const PING_TYPE = 'ping@1.0.0';
		const PING_SLUG = 'ping-api';

		const getTypeStartDate = new Date();
		return kernel
			.getContractBySlug(request.context, kernel.adminSession()!, PING_TYPE)
			.then(async (typeContract) => {
				const getTypeEndDate = new Date();
				if (!typeContract) {
					throw new Error(`No type contract: ${PING_TYPE}`);
				}

				logger.info(request.context, 'Got type contract', {
					slug: typeContract.slug,
					time: getTypeEndDate.getTime() - getTypeStartDate.getTime(),
				});

				const adminSession = await kernel.getContractById(
					request.context,
					kernel.adminSession()!,
					kernel.adminSession()!,
				);
				strict(adminSession);
				const enqueueStartDate = new Date();
				const actionRequest = await worker.insertCard<ActionRequestContract>(
					request.context,
					kernel.adminSession()!,
					worker.typeContracts['action-request@1.0.0'],
					{
						actor: adminSession.data.actor,
						timestamp: new Date().toISOString(),
					},
					{
						type: 'action-request@1.0.0',
						data: {
							action: 'action-ping@1.0.0',
							context: request.context,
							card: typeContract.id,
							type: typeContract.type,
							actor: adminSession.data.actor,
							epoch: new Date().valueOf(),
							input: {
								id: typeContract.id,
							},
							timestamp: new Date().toISOString(),
							arguments: {
								slug: PING_SLUG,
							},
						},
					},
				);
				strict(actionRequest);

				const enqueueEndDate = new Date();
				logger.info(request.context, 'Enqueue ping request', {
					slug: actionRequest.slug,
					time: enqueueEndDate.getTime() - enqueueStartDate.getTime(),
				});

				const waitStartDate = new Date();
				const results = await worker.producer.waitResults(
					request.context,
					actionRequest,
				);

				const waitEndDate = new Date();
				logger.info(request.context, 'Waiting for ping results', {
					slug: actionRequest.slug,
					time: waitEndDate.getTime() - waitStartDate.getTime(),
				});

				if (results.error) {
					return response.status(500).json(results);
				}

				return response.status(200).json({
					error: false,
					data:
						typeof results.data === 'object'
							? _.omit(results.data, ['links'])
							: results.data,
				});
			})
			.catch((error) => {
				const errorObject = errio.toObject(error, {
					stack: true,
				});

				logger.exception(request.context, 'Ping error', error);
				return response.status(500).json({
					error: true,
					data: errorObject,
				});
			});
	});

	application.get('/api/v2/registry', async (request, response) => {
		return registry.authenticate(request, response, kernel);
	});

	application.get('/api/v2/oauth/:provider/:slug', (request, response) => {
		const associateUrl = oauth.getAuthorizeUrl(
			request.params.provider,
			request.params.slug,
			{
				sync: options.sync,
			},
		);
		const status = associateUrl ? 200 : 400;
		return response.status(status).json({
			error: false,
			data: {
				url: associateUrl,
			},
		});
	});

	const oauthAssociate = async (request, response, slug, code) => {
		logger.info(request.context, `Associating oauth user: ${slug}`, {
			source: request.params.provider,
		});

		if (!slug) {
			return response.sendStatus(401);
		}

		try {
			// 1. Exchange oauth code for token
			const credentials = await oauth.authorize(
				request.context,
				worker,
				kernel.adminSession()!,
				request.params.provider,
				{
					code,
					ip: request.ip,
				},
			);

			// 2. Fetch user data from provider
			const externalUser = await oauth.whoami(
				request.context,
				request.params.provider,
				credentials,
				{
					sync: options.sync,
				},
			);

			// 3. Get jellyfish user that matches external user
			let user = await oauth.match(
				request.context,
				worker,
				kernel.adminSession()!,
				request.params.provider,
				externalUser,
				{
					slug,
					sync: options.sync,
				},
			);

			// 4. If no matching user was found, create it
			if (!user) {
				await oauth.sync(
					request.context,
					worker,
					kernel.adminSession()!,
					request.params.provider,
					externalUser,
					{
						sync: options.sync,
					},
				);

				user = await worker.kernel.getContractBySlug(
					request.context,
					kernel.adminSession()!,
					`${slug}@1.0.0`,
				);

				if (!user) {
					logger.info(
						request.context,
						`Failed to sync external oauth user: ${slug}`,
						{
							source: request.params.provider,
							externalUser,
						},
					);

					return response.status(401).json({
						error: true,
						data: `User sync failed for the user: ${slug}`,
					});
				}
			}

			// 5. Attach external token to the user
			await oauth.associate(
				request.context,
				worker,
				kernel.adminSession()!,
				request.params.provider,
				user,
				credentials,
				{
					ip: request.ip,
				},
			);

			const sessionTypeContract = await kernel.getContractBySlug(
				request.context,
				kernel.adminSession()!,
				'session@1.0.0',
			);

			/*
			 * This allows us to differentiate two login requests
			 * coming on the same millisecond, unlikely but possible.
			 */
			const suffix = uuidv4();

			const adminSession = await kernel.getContractById(
				request.context,
				kernel.adminSession()!,
				kernel.adminSession()!,
			);
			strict(adminSession);
			const actionRequest = await worker.insertCard<ActionRequestContract>(
				request.context,
				kernel.adminSession()!,
				worker.typeContracts['action-request@1.0.0'],
				{
					actor: adminSession.data.actor,
					timestamp: new Date().toISOString(),
				},
				{
					type: 'action-request@1.0.0',
					data: {
						action: 'action-create-card@1.0.0',
						context: request.context,
						card: sessionTypeContract!.id,
						type: sessionTypeContract!.type,
						actor: adminSession.data.actor,
						epoch: new Date().valueOf(),
						input: {
							id: sessionTypeContract!.id,
						},
						timestamp: new Date().toISOString(),
						arguments: {
							reason: null,
							properties: {
								version: '1.0.0',
								slug: `session-${user.slug}-${Date.now()}-${suffix}`,
								data: {
									actor: user.id,
								},
							},
						},
					},
				},
			);
			strict(actionRequest);

			const createSessionResult = await worker.producer.waitResults(
				request.context,
				actionRequest,
			);

			if (createSessionResult.error) {
				throw errio.fromObject(createSessionResult.data);
			}

			// TODO: maybe `waitResults` should be generic?
			if (
				typeof createSessionResult.data !== 'object' ||
				!('id' in createSessionResult.data!)
			) {
				throw new Error(
					`Invalid create session result: ${typeof createSessionResult.data}`,
				);
			}

			return response.status(200).json({
				error: false,
				data: {
					access_token: createSessionResult.data.id,
					token_type: 'Bearer',
				},
			});
		} catch (error: any) {
			if (
				['OAuthUnsuccessfulResponse', 'SyncNoMatchingUser'].includes(error.name)
			) {
				return response.status(401).json({
					error: true,
					data: _.pick(error, ['name', 'message']),
				});
			}

			return sendHTTPError(request, response, error);
		}
	};

	application.post('/api/v2/oauth/:provider', (request, response) => {
		return oauthAssociate(
			request,
			response,
			request.body.slug,
			request.body.code,
		);
	});

	application.get('/oauth/:provider', (request, response) => {
		return oauthAssociate(
			request,
			response,
			request.query.state,
			request.query.code,
		);
	});

	application.get('/api/v2/type/:type', async (request, response) => {
		return metrics
			.measureHttpType(() => {
				const [base, version] = request.params.type.split('@');
				return kernel
					.query(request.context, request.session, {
						type: 'object',
						additionalProperties: true,
						required: ['type'],
						properties: {
							type: {
								type: 'string',
								const: `${base}@${version || '1.0.0'}`,
							},
						},
					})
					.then((results) => {
						return response.status(200).json(results);
					});
			})
			.catch((error) => {
				return sendHTTPError(request, response, error);
			});
	});

	application.get('/api/v2/id/:id', async (request, response) => {
		return metrics
			.measureHttpId(() => {
				return kernel
					.getContractById(request.context, request.session, request.params.id)
					.then((contract) => {
						if (contract) {
							return response.status(200).json(contract);
						}

						return response.status(404).end();
					});
			})
			.catch((error) => {
				return sendHTTPError(request, response, error);
			});
	});

	application.get('/api/v2/slug/:slug', async (request, response) => {
		return metrics
			.measureHttpSlug(() => {
				return kernel
					.getContractBySlug(
						request.context,
						request.session,
						`${request.params.slug}@latest`,
					)
					.then((contract) => {
						if (contract) {
							return response.status(200).json(contract);
						}

						return response.status(404).end();
					});
			})
			.catch((error) => {
				return sendHTTPError(request, response, error);
			});
	});

	// Some services, such as Workable, require the user to register
	// different endpoints for every type of event we're interested in,
	// which means we can't send more than one event type to
	// /api/v2/hooks/workable. As a solution, we can allow this rule to
	// have an optional "type" parameter that is not used for anything
	// apart from differentiating the endpoints.
	application.all('/api/v2/hooks/:provider/:type*?', (request, response) => {
		const hostname = request.headers.host;
		const startDate = new Date();
		logger.info(request.context, 'Received webhook', {
			ip: request.ip,
			source: request.params.provider,
		});

		// A dummy /dev/null that we can use in various
		// services for testing purposes.
		if (request.params.provider === 'none') {
			return response.status(200).end();
		}

		const integrationToken = environment.integration[request.params.provider];

		return Bluebird.try(async () => {
			if (
				!(await options.sync.isValidEvent(
					request.context,
					request.params.provider,
					integrationToken,
					{
						raw: request.rawBody || request.body,
						headers: request.headers,
					},
				))
			) {
				logger.warn(request.context, 'Webhook rejected', {
					ip: request.ip,
					source: request.params.provider,
					hostname,
					body: request.body,
				});

				return response.status(401).json({
					error: true,
					data: 'Webhook rejected',
				});
			}

			if (_.isEmpty(request.body)) {
				return response.status(400).json({
					error: true,
					data: 'Invalid external event',
				});
			}

			const validateDate = new Date();
			logger.info(request.context, 'Webhook validated', {
				source: request.params.provider,
				ip: request.ip,
				time: validateDate.getTime() - startDate.getTime(),
			});

			const EXTERNAL_EVENT_BASE_TYPE = 'external-event';
			const EXTERNAL_EVENT_TYPE = `${EXTERNAL_EVENT_BASE_TYPE}@1.0.0`;
			return kernel
				.getContractBySlug(
					request.context,
					kernel.adminSession()!,
					EXTERNAL_EVENT_TYPE,
				)
				.then((typeContract) => {
					if (!typeContract) {
						throw new Error(`No type contract: ${EXTERNAL_EVENT_TYPE}`);
					}

					const id = uuidv4();
					return new Promise((resolve) => {
						const slug = `${EXTERNAL_EVENT_BASE_TYPE}-${id}`;

						logger.info(request.context, 'Creating external event', {
							source: request.params.provider,
							slug,
						});

						return resolve(
							kernel
								.getContractById(
									request.context,
									kernel.adminSession()!,
									kernel.adminSession()!,
								)
								.then((adminSession) => {
									strict(adminSession);
									return worker.insertCard<ActionRequestContract>(
										request.context,
										kernel.adminSession()!,
										worker.typeContracts['action-request@1.0.0'],
										{
											timestamp: new Date().toISOString(),
										},
										{
											type: 'action-request@1.0.0',
											data: {
												action: 'action-create-card@1.0.0',
												context: request.context,
												card: typeContract.id,
												type: typeContract.type,
												actor: adminSession.data.actor,
												epoch: new Date().valueOf(),
												input: {
													id: typeContract.id,
												},
												timestamp: new Date().toISOString(),
												arguments: {
													reason: null,
													properties: {
														slug,
														version: '1.0.0',
														data: {
															source: request.params.provider,
															headers: request.headers,
															payload: request.body,
														},
													},
												},
											},
										},
									);
								}),
						);
					});
				})
				.then((actionRequest) => {
					const enqueuedDate = new Date();
					logger.info(request.context, 'Webhook enqueued', {
						source: request.params.provider,
						ip: request.ip,
						time: enqueuedDate.getTime() - startDate.getTime(),
					});

					return response.status(200).json({
						error: false,
						data: actionRequest,
					});
				});
		}).catch((error) => {
			error.body = request.body;
			logger.exception(request.context, 'Webhook error', error);
			return response.status(500).json({
				error: true,
				data: {
					type: 'Error',
					message: error.message,
				},
			});
		});
	});

	application.get(
		'/api/v2/file/:cardId/:fileName',
		async (request, response) => {
			const contract = await kernel.getContractById(
				request.context,
				request.session,
				request.params.cardId,
			);
			if (!contract) {
				return response.send(404);
			}

			const sessionContract = await kernel.getContractById<SessionContract>(
				request.context,
				request.session,
				request.session,
			);
			if (!sessionContract) {
				return response.send(401);
			}

			const attachment = _.find(
				_.get(contract, ['data', 'payload', 'attachments']),
				(item) => {
					return item.url.includes(request.params.fileName);
				},
			);

			if (attachment) {
				return options.sync
					.getFile(
						'front',
						environment.integration.front,
						request.params.fileName,
						// TS-TODO: this is an incomplete type
						{
							log: {
								warn: (message, data) => {
									logger.warn(request.context, message, data);
								},
								info: (message, data) => {
									logger.info(request.context, message, data);
								},
							},
						} as any,
						{
							actor: sessionContract.data.actor,
						},
					)
					.then((file) => {
						return response.status(200).send(file);
					})
					.catch((error) => {
						return sendHTTPError(request, response, error);
					});
			}

			return fileStore
				.retrieve(
					request.context,
					request.params.cardId,
					request.params.fileName,
				)
				.then((file) => {
					if (!file) {
						return response.status(404).end();
					}

					return response.status(200).send(file);
				})
				.catch((error) => {
					return sendHTTPError(request, response, error);
				});
		},
	);

	application.post(
		'/api/v2/action',
		upload.any(),
		async (request, response) => {
			return metrics
				.measureHttpAction(() => {
					// If files are uploaded, the action payload is serialized as the form field
					// "action" and will need to be parsed
					const action = request.files
						? JSON.parse(request.body.action)
						: request.body;

					logger.info(request.context, 'HTTP action request', {
						ip: request.ip,
						card: action.card,
						type: action.type,
						action: action.action,
					});

					if (_.isEmpty(action)) {
						return response.status(400).json({
							error: true,
							data: 'No action request',
						});
					}

					if (!action.type) {
						return response.status(400).json({
							error: true,
							data: 'No action contract type',
						});
					}

					if (!action.card) {
						return response.status(400).json({
							error: true,
							data: 'No input contract',
						});
					}

					return actionFacade
						.processAction(request.context, request.session, action, {
							files: request.files,
						})
						.then((data) => {
							response.status(200).json({
								error: false,
								data,
							});
						});
				})
				.catch((error) => {
					return sendHTTPError(request, response, error);
				});
		},
	);

	application.post('/api/v2/query', async (request, response) => {
		return metrics
			.measureHttpQuery(() => {
				if (_.isEmpty(request.body)) {
					return response.status(400).json({
						error: true,
						data: 'No query schema',
					});
				} else if (_.isPlainObject(request.body) && !request.body.query) {
					return response.status(400).json({
						error: true,
						data: 'Invalid request body',
					});
				}

				return queryFacade
					.queryAPI(
						request.context,
						request.session,
						request.body.query,
						request.body.options,
						request.ip,
					)
					.then((data) => {
						return response.status(200).json({
							error: false,
							data,
						});
					});
			})
			.catch((error) => {
				logger.warn(request.context, 'JSON Schema query error', request.body);
				return sendHTTPError(request, response, error);
			});
	});

	application.post('/api/v2/view/:slug', (request, response) => {
		viewFacade
			.queryByView(
				request.context,
				request.session,
				request.params.slug,
				request.body.params,
				request.body.options,
				request.ip,
			)
			.then((data) => {
				if (!data) {
					return response.status(404).end();
				}

				return response.status(200).json({
					error: false,
					data,
				});
			})
			.catch((error) => {
				return sendHTTPError(request, response, error);
			});
	});

	application.get('/api/v2/whoami', async (request, response) => {
		return metrics
			.measureHttpWhoami(async () => {
				const user = await authFacade.whoami(
					request.context,
					request.session,
					request.ip,
				);

				return response.status(200).json({
					error: false,
					data: user,
				});
			})
			.catch((error) => {
				return sendHTTPError(request, response, error);
			});
	});

	// The login route dispatches the login request to the auth facade using
	// the admin session. This is a special case because we don't want anonymous
	// users to be able to access execute contracts
	application.post('/api/v2/login', async (request, response) => {
		const { username, password } = request.body;

		// Verify parameters
		const parameters = {
			username,
			password,
		};
		for (const [key, value] of Object.entries(parameters).sort()) {
			if (!_.isString(value)) {
				return response.status(400).json({
					error: true,
					data: `Invalid ${key}`,
				});
			}
		}

		// Normalize username to lower case
		const slug = `user-${username}`.toLowerCase();
		const action = {
			logContext: request.context,
			card: slug,
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password,
			},
		};

		return actionFacade
			.processAction(request.context, kernel.adminSession()!, action)
			.then((data) => {
				return response.status(200).json({
					error: false,
					data,
				});
			})
			.catch((error) => {
				return sendHTTPError(request, response, error);
			});
	});

	application.post(
		'/api/v2/request-password-reset',
		async (request, response) => {
			const { username } = request.body;

			// Verify parameters
			const parameters = {
				username,
			};
			for (const [key, value] of Object.entries(parameters).sort()) {
				if (!_.isString(value)) {
					return response.status(400).json({
						error: true,
						data: `Invalid ${key}`,
					});
				}
			}

			const userType = (await kernel.getContractBySlug(
				request.context,
				kernel.adminSession()!,
				'user@latest',
			))!;
			const action = {
				logContext: request.context,
				card: userType.id,
				action: 'action-request-password-reset@1.0.0',
				type: userType.type,
				arguments: {
					username,
				},
			};

			// Always return a 200 OK status, to prevent data leaking to unauthorized users
			return actionFacade
				.processAction(request.context, kernel.adminSession()!, action)
				.finally(() => {
					return response.status(200).json({
						error: false,
						data: 'ok',
					});
				});
		},
	);

	application.post(
		'/api/v2/complete-password-reset',
		async (request, response) => {
			const { newPassword, resetToken } = request.body;

			// Verify parameters
			const parameters = {
				newPassword,
				resetToken,
			};
			for (const [key, value] of Object.entries(parameters).sort()) {
				if (!_.isString(value)) {
					return response.status(400).json({
						error: true,
						data: `Invalid ${key}`,
					});
				}
			}

			const userType = (await kernel.getContractBySlug(
				request.context,
				kernel.adminSession()!,
				'user@latest',
			))!;
			const action = {
				logContext: request.context,
				card: userType.id,
				action: 'action-complete-password-reset@1.0.0',
				type: userType.type,
				arguments: {
					newPassword,
					resetToken,
				},
			};

			// Always return a 200 OK status, to prevent data leaking to unauthorized users
			return actionFacade
				.processAction(request.context, kernel.adminSession()!, action)
				.finally(() => {
					return response.status(200).json({
						error: false,
						data: 'ok',
					});
				});
		},
	);

	application.post(
		'/api/v2/complete-first-time-login',
		async (request, response) => {
			const { newPassword, firstTimeLoginToken } = request.body;

			// Verify parameters
			const parameters = {
				newPassword,
				firstTimeLoginToken,
			};
			for (const [key, value] of Object.entries(parameters).sort()) {
				if (!_.isString(value)) {
					return response.status(400).json({
						error: true,
						data: `Invalid ${key}`,
					});
				}
			}

			const userType = (await kernel.getContractBySlug(
				request.context,
				kernel.adminSession()!,
				'user@latest',
			))!;
			const action = {
				logContext: request.context,
				card: userType.id,
				action: 'action-complete-first-time-login@1.0.0',
				type: userType.type,
				arguments: {
					newPassword,
					firstTimeLoginToken,
				},
			};

			// Always return a 200 OK status, to prevent data leaking to unauthorized users
			return actionFacade
				.processAction(request.context, kernel.adminSession()!, action)
				.finally(() => {
					return response.status(200).json({
						error: false,
						data: 'ok',
					});
				});
		},
	);

	application.post('/api/v2/signup', async (request, response) => {
		const { username, email, password } = request.body;

		// Verify parameters
		const parameters = {
			username,
			email,
			password,
		};
		for (const [key, value] of Object.entries(parameters).sort()) {
			if (!_.isString(value)) {
				return response.status(400).json({
					error: true,
					data: `Invalid ${key}`,
				});
			}
		}

		// Normalize username and email to lower case
		const name = username.toLowerCase();
		const mail = email.toLowerCase();

		const action = {
			logContext: request.context,
			card: 'user',
			type: 'type',
			action: 'action-create-user@1.0.0',
			arguments: {
				email: mail,
				username: `user-${name}`,
				password,
			},
		};

		return actionFacade
			.processAction(request.context, request.session, action)
			.then((data) => {
				return response.status(200).json({
					error: false,
					data,
				});
			})
			.catch((error) => {
				return sendHTTPError(request, response, error);
			});
	});
};
