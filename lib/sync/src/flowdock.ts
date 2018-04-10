import convertBase = require('bigint-base-converter');
import * as Promise from 'bluebird';
import {
	Flow,
	Message,
	Session,
	User,
} from 'flowdock';
import * as _ from 'lodash';
import * as Moment from 'moment';
import * as request from 'request-promise';

type DateTime = string | Moment.Moment;

type LogFunction = (output: any) => void;

type PrivacyPreferences = 'ALWAYS' | 'PREFERRED' | 'NEVER';

interface Dictionary<T> {
	[key: string]: T;
}

interface ThreadDetail {
	description: string;
}

interface ThreadIds {
	service: string;
	instance: string;
	flow: string;
	thread: string;
	url?: string;
}

interface UserDetail {
	email: string;
	roles: string[];
}

interface UserIds {
	service: string;
	instance: string;
	username: string;
}

interface MessageDetail {
	timestamp: string;
	target: string;
	actor: string;
	payload: {
		hidden: PrivacyPreferences;
		message: string;
	};
}

interface MessageIds {
	service: string;
	instance: string;
	flow: string;
	thread: string;
	message: string;
}

interface LinkCard {
	slug: string;
	id: string;
	data: {
		internal: string;
		external: Dictionary<string | undefined>;
	};
}

interface UpsertIds {
	service: string;
	instance: string;
	flow: string;
	thread: string;
	message: string;
	username: string;
	[key: string]: string;
}

interface UpsertPayload {
	title: string;
	content: string;
	hidden: PrivacyPreferences;
	timestamp: DateTime;
	email: string;
}

interface UpsertInstructions {
	idAlphabets: Dictionary<string>;
	ids: UpsertIds;
	payload: UpsertPayload;
	misc: Dictionary<string>;
}

interface Logger {
	debug: LogFunction;
	error: LogFunction;
	info: LogFunction;
}

interface FlowdockCache {
	flowsById: Dictionary<Flow>;
	usersById: Dictionary<User>;
}

interface JellyfishConnectionDetails {
	username: string;
	password: string;
	server: string;
	port: number;
	protocol: string;
}

interface FlowdockConnectionDetails {
	token: string;
}

interface MonitorConnectionDetails {
	flowdock: FlowdockConnectionDetails;
	jellyfish: JellyfishConnectionDetails;
}

class ThreadStore {
	public static connect(options: JellyfishConnectionDetails): Promise<ThreadStore> {
		return request({
			body: {
				username: options.username,
				password: options.password,
			},
			json: true,
			method: 'POST',
			uri: `${options.protocol}://${options.server}:${options.port.toString()}/api/v1/login`,
		})
		.then((response) => {
			if (response.error) {
				throw response.error;
			}
			return new ThreadStore(options.protocol, options.server, options.port, response.data.results.data);
		});
	}

	private static convertSlug(alphabets: Dictionary<string>, ids: UpsertIds, index: string): string {
		const slugAlphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
		const id = ids[index];
		const alphabet = alphabets[index];
		return (id && alphabet) ? convertBase(id, alphabet, slugAlphabet) : id;
	}

	private static convertSlugs(alphabets: Dictionary<string>, ids: UpsertIds) {
		const sluggedParts = {
			service: this.convertSlug(alphabets, ids, 'service'),
			instance: this.convertSlug(alphabets, ids, 'instance'),
			flow: this.convertSlug(alphabets, ids, 'flow'),
			thread: this.convertSlug(alphabets, ids, 'thread'),
			message: this.convertSlug(alphabets, ids, 'message'),
			username: this.convertSlug(alphabets, ids, 'username'),
		};
		const threadSlugPart = `${sluggedParts.service}-${sluggedParts.instance}-${sluggedParts.flow}-${sluggedParts.thread}`;
		return {
			thread: `thread-${threadSlugPart}`,
			user: `user-${sluggedParts.service}-${sluggedParts.instance}-${sluggedParts.username}`,
			message: `message-${threadSlugPart}-${sluggedParts.message}`,
		};
	}

	private protocol: string;
	private server: string;
	private port: number;
	private token: string;

	private constructor(protocol: string, server: string, port: number, token: string) {
		this.protocol = protocol;
		this.server = server;
		this.port = port;
		this.token = token;
	}

	public upsertThread(upsertInstructions: UpsertInstructions): Promise<string> {
		const protoSlugs = ThreadStore.convertSlugs(upsertInstructions.idAlphabets, upsertInstructions.ids);
		const threadDetail: ThreadDetail = {
			description: upsertInstructions.payload.title,
		};
		const threadIds: ThreadIds = {
			service: upsertInstructions.ids.service,
			flow: upsertInstructions.ids.flow,
			instance: upsertInstructions.ids.instance,
			thread: upsertInstructions.ids.thread,
		};
		return this.upsertByLink(protoSlugs.thread, 'chat-thread', threadDetail, threadIds)
		.then((threadUUID: string) => {
			const userDetail: UserDetail = {
				email: upsertInstructions.payload.email,
				roles: [],
			};
			const userIds: UserIds = {
				service: upsertInstructions.ids.service,
				instance: upsertInstructions.ids.instance,
				username: upsertInstructions.ids.username,
			};
			return this.upsertByLink(protoSlugs.user, 'user', userDetail, userIds)
			.then((userUUID) => {
				const messageDetail: MessageDetail = {
					timestamp: Moment(upsertInstructions.payload.timestamp).toISOString(),
					target: threadUUID,
					actor: userUUID,
					payload: {
						message: upsertInstructions.payload.content,
						hidden: upsertInstructions.payload.hidden,
					}
				};
				const messageIds: MessageIds = {
					service: upsertInstructions.ids.service,
					instance: upsertInstructions.ids.instance,
					thread: upsertInstructions.ids.thread,
					flow: upsertInstructions.ids.flow,
					message: upsertInstructions.ids.message,
				};
				return this.upsertByLink(protoSlugs.message, 'chat-message', messageDetail, messageIds);
			})
			.return(threadUUID);
		});
	}

	private upsertByLink(protoSlug: string, type: string, payload: object, ids: object): Promise<string> {
		// In a world with SyncBot in it, each internal card may coordinate with
		// several external resources.  Each external service will have ways of
		// uniquely identifying these resources, but most do not have support for
		// an external identifier (aka Jellyfish UUID).  To resolve this I use a
		// `-link` card, referenced by a slug created from data on the external
		// service, which gets us to the UUID of the underlying card.
		const linkSlug = `external-${protoSlug}-link`;
		// See if we already know about this entity
		return this.get(linkSlug)
		.then((link: LinkCard | null) => {
			if (link) {
				// Update the record for this entity
				return this.patch(link.data.internal, payload)
				.then(() => {
					// Resolve to the UUID for this
					return link.data.internal;
				});
			}
			// Create the record for this entity
			return this.post(type, protoSlug, payload)
			.then((id: string) => {
				// Create the link for this entity
				return this.post(`${type}-link`, linkSlug, { external: ids, internal: id })
				.then(() => {
					// Resolve to the UUID for this
					return id;
				});
			});
		});
	}

	private get(identifier: string): Promise<object | null> {
		return this.request('GET', identifier);
	}

	private post(type: string, slug: string, data: object): Promise<string> {
		return this.request('POST', undefined, { type, data, slug })
		.then((response) => {
			return _.get(response, ['results', 'data']);
		});
	}

	private patch(identifier: string, data: object): Promise<object> {
		return this.request('PATCH', identifier, { data })
		.then((response) => {
			if (!response) {
				throw new Error(`Card ${identifier} does not exist to patch.`);
			}
			return response;
		});
	}

	private request(method: string, identifier?: string, body?: object): Promise<object | null> {
		return request({
			body,
			headers: {
				authorization: this.token,
			},
			json: true,
			method,
			url: `${this.protocol}://${this.server}:${this.port.toString()}/api/v1/card/${identifier || ''}`,
		})
		.then((response) => {
			if (response.error) {
				throw new Error(JSON.stringify(response));
			}
			if (_.get(response, ['data', 'results', 'error'])) {
				throw new Error(JSON.stringify(response.data.results));
			}
			return response.data;
		});
	}
}

class ThreadStream {
	public static connect(options: FlowdockConnectionDetails): Promise<ThreadStream> {
		return new Promise<ThreadStream>((resolve, reject) => {
			const session = new Session(options.token);
			const cache: FlowdockCache = {
				flowsById: {},
				usersById: {},
			};
			session.on('error', () => { /* do nothing */ });
			session.flows((error: any, flows: Flow[]) => {
				if (error) {
					reject(error);
				} else {
					_.forEach(flows, (flow) => {
						cache.flowsById[flow.id] = flow;
						_.forEach(flow.users, (user) => {
							cache.usersById[user.id] = user;
						});
					});
					resolve(new ThreadStream(session, cache));
				}
			});
		});
	}

	private session: Session;
	private cache: FlowdockCache;

	private constructor(session: Session, cache: FlowdockCache) {
		this.session = session;
		this.cache = cache;
	}

	public onThreadUpdate(handler: (upsertInstructions: UpsertInstructions) => Promise<void>): void {
		const flowIds = _.keys(this.cache.flowsById);
		const stream = this.session.stream(flowIds);
		stream.on('message', (message: Message) => {
			if (message.event === 'message') {
				const service = 'flowdock';
				const instance = this.cache.flowsById[message.flow].organization.parameterized_name;
				const flow = this.cache.flowsById[message.flow].parameterized_name;
				const thread = message.thread.id;
				const username = this.cache.usersById[message.user].nick;
				const upsertInstructions: UpsertInstructions = {
					idAlphabets: {
						thread: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_',
					},
					ids: {
						service,
						instance,
						flow,
						thread,
						username,
						message: message.id.toString(),
					},
					payload: {
						title: message.thread.title,
						email: this.cache.usersById[message.user].email,
						hidden: 'NEVER',
						content: message.content.toString(),
						timestamp: message.created_at,
					},
					misc: {
						url: `https://www.flowdock.com/app/${instance}/${flow}/threads/${thread}`,
					},
				};
				handler(upsertInstructions);
			}
		});
	}
}

class FlowdockMonitor {
	public static connect(options: MonitorConnectionDetails, logger: Logger): Promise<FlowdockMonitor> {
		logger.info('Connecting to endpoints.');
		return Promise.props({
			store: this.connectToThreadStore(options.jellyfish, logger),
			stream: this.connectToThreadStream(options.flowdock, logger),
		})
		.then((value: {store: ThreadStore, stream: ThreadStream}) => {
			logger.info('All endpoints connected.');
			return new FlowdockMonitor(value.store, value.stream, logger);
		});
	}

	private static connectToThreadStore(options: JellyfishConnectionDetails, logger: Logger): Promise<ThreadStore> {
		return ThreadStore.connect(options)
		.then((threadStore: ThreadStore) => {
			logger.info('Connected to thread store.');
			return threadStore;
		});
	}

	private static connectToThreadStream(options: FlowdockConnectionDetails, logger: Logger): Promise<ThreadStream> {
		return ThreadStream.connect(options)
		.then((threadStream: ThreadStream) => {
			logger.info('Connected to thread stream.');
			return threadStream;
		});
	}

	private constructor(store: ThreadStore, stream: ThreadStream, logger: Logger) {
		stream.onThreadUpdate((upsertInstructions) => {
			logger.info(`Received update to thread ${upsertInstructions.misc.url}`);
			return store.upsertThread(upsertInstructions)
			.then((threadUUID) => {
				logger.info(`Upserted thread ${threadUUID}`);
			});
		});
		logger.info('Joined endpoints together.');
	}
}

const providedToken = process.argv[2] || process.env.FLOWDOCK_TOKEN;
if (providedToken) {
	const logger = {
		debug: _.partial(console.log, ':|') as LogFunction,
		error: _.partial(console.log, ':(') as LogFunction,
		info: _.partial(console.log, ':)') as LogFunction,
	};
	const connectDetails = {
		flowdock: {
			token: providedToken
		},
		jellyfish: {
			// TODO
			protocol: 'http',
			server: 'localhost',
			port: 8000,
			username: 'actions',
			password: 'test'
		}
	};
	FlowdockMonitor.connect(connectDetails, logger)
	.then(() => {
		logger.info('Don\'t cross the streams.');
	});
} else {
	console.log('Must provide a token, either in arguments or in environment variables.');
	process.exit();
}
