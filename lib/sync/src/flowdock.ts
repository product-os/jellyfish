import convertBase = require('bigint-base-converter');
import * as Promise from 'bluebird';
import {
	Flow,
	Message,
	Session,
	User,
} from 'flowdock';
import { JSONSchema4 as JSONSchema } from 'json-schema';
import * as _ from 'lodash';
import * as Moment from 'moment';
import { Options } from 'request';
import * as request from 'request-promise';

type DateTime = string | Moment.Moment;

type LogFunction = (output: any) => void;

type PrivacyPreferences = 'ALWAYS' | 'PREFERRED' | 'NEVER';

interface Dictionary<T> {
	[index: string]: T;
}

interface BaseIds {
	service: string;
	instance: string;
}

interface BaseDetails {
	externalIds: Dictionary<BaseIds>;
}

interface BaseCard {
	data: BaseDetails;
}

interface DBBackedCard extends BaseCard {
	id: string;
}

interface CandidateCard extends BaseCard {
	slug: string;
	type: string;
}

interface ThreadIds extends BaseIds {
	flow: string;
	thread: string;
}

interface ThreadDetails extends BaseDetails {
	description: string;
	externalIds: Dictionary<ThreadIds>;
}

interface ThreadCandidateCard extends CandidateCard {
	data: ThreadDetails;
}

interface AuthorIds extends BaseIds {
	username: string;
}

interface AuthorDetails extends BaseDetails {
	externalIds: Dictionary<AuthorIds>;
}

interface AuthorCandidateCard extends CandidateCard {
	data: AuthorDetails;
}

interface MessageIds extends ThreadIds {
	message: string;
}

interface MessageDetails extends BaseDetails {
	timestamp: string;
	target: string;
	actor: string;
	payload: {
		hidden: PrivacyPreferences;
		message: string;
	};
	externalIds: Dictionary<MessageIds>;
}

interface MessageCandidateCard extends CandidateCard {
	data: MessageDetails;
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

interface UpsertUrls {
	thread: string;
	message: string;
	user: string;
}

interface UpsertPayload {
	title: string;
	content: string;
	hidden: PrivacyPreferences;
	timestamp: DateTime;
}

interface UpsertInstructions {
	idAlphabets: Dictionary<string>;
	ids: UpsertIds;
	payload: UpsertPayload;
	urls: UpsertUrls;
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
		const slugParts = {
			service: this.convertSlug(alphabets, ids, 'service'),
			instance: this.convertSlug(alphabets, ids, 'instance'),
			flow: this.convertSlug(alphabets, ids, 'flow'),
			thread: this.convertSlug(alphabets, ids, 'thread'),
			message: this.convertSlug(alphabets, ids, 'message'),
			username: this.convertSlug(alphabets, ids, 'username'),
		};
		const threadSlugPart = `${slugParts.service}-${slugParts.instance}-${slugParts.flow}-${slugParts.thread}`;
		return {
			thread: `thread-${threadSlugPart}`,
			user: `author-${slugParts.service}-${slugParts.instance}-${slugParts.username}`,
			message: `message-${threadSlugPart}-${slugParts.message}`,
		};
	}

	private readonly protocol: string;
	private readonly server: string;
	private readonly port: number;
	private readonly token: string;

	private constructor(protocol: string, server: string, port: number, token: string) {
		this.protocol = protocol;
		this.server = server;
		this.port = port;
		this.token = token;
	}

	public upsertThread(upsertInstructions: UpsertInstructions): Promise<void> {
		const protoSlugs = ThreadStore.convertSlugs(upsertInstructions.idAlphabets, upsertInstructions.ids);
		const thread: ThreadCandidateCard = {
			slug: protoSlugs.thread,
			type: 'chat-thread',
			data: {
				description: upsertInstructions.payload.title,
				externalIds: {
					[upsertInstructions.urls.thread]: {
						service: upsertInstructions.ids.service,
						instance: upsertInstructions.ids.instance,
						flow: upsertInstructions.ids.flow,
						thread: upsertInstructions.ids.thread,
					},
				},
			}
		};
		const author: AuthorCandidateCard = {
			slug: protoSlugs.user,
			type: 'chat-author',
			data: {
				externalIds: {
					[upsertInstructions.urls.user]: {
						service: upsertInstructions.ids.service,
						instance: upsertInstructions.ids.instance,
						username: upsertInstructions.ids.username,
					}
				}
			}
		};
		return Promise.props({
			thread: this.upsertLinkedCard(thread),
			author: this.upsertLinkedCard(author),
		})
		.then((ids) => {
			const message: MessageCandidateCard = {
				slug: protoSlugs.message,
				type: 'chat-message',
				data: {
					timestamp: Moment(upsertInstructions.payload.timestamp).toISOString(),
					target: ids.thread,
					actor: ids.author,
					payload: {
						hidden: upsertInstructions.payload.hidden,
						message: upsertInstructions.payload.content,
					},
					externalIds: {
						[upsertInstructions.urls.message]: {
							service: upsertInstructions.ids.service,
							instance: upsertInstructions.ids.instance,
							flow: upsertInstructions.ids.flow,
							thread: upsertInstructions.ids.thread,
							message: upsertInstructions.ids.message,
						},
					},
				}
			};
			return this.upsertLinkedCard(message)
			.return();
		});
	}

	private upsertLinkedCard(
		candidateCard: CandidateCard,
	): Promise<string> {
		return this.getSimilar(candidateCard)
		.then((getResponse: DBBackedCard) => {
			if (getResponse) {
				const patchCard: DBBackedCard = {
					id: getResponse.id,
					data: candidateCard.data,
				};
				patchCard.data.externalIds = _.merge(getResponse.data.externalIds, candidateCard.data.externalIds);
				return this.patch(patchCard);
			} else {
				return this.post(candidateCard);
			}
		});
	}

	private getSimilar(payload: CandidateCard): Promise<DBBackedCard | null> {
		const query: JSONSchema = {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: payload.type,
				},
				data: {
					type: 'object',
					properties: {
						externalIds: {
							type: 'object',
							required: _.keys(payload.data.externalIds),
							additionalProperties: true,
						},
					},
					required: [
						'externalIds',
					],
					additionalProperties: true,
				},
			},
			required: [
				'data',
				'type',
			],
			additionalProperties: true,
		};
		return this.query(query)
		.then((dbBackedCards: DBBackedCard[]) => {
			if (dbBackedCards.length > 1) {
				throw new Error('Multiple similar cards.');
			} else if (dbBackedCards.length < 1) {
				return null;
			} else {
				return dbBackedCards[0];
			}
		});
	}

	private post(card: CandidateCard): Promise<string> {
		return this.action('action-create-card', card.type, { slug: card.slug, data: card.data });
	}

	private patch(card: DBBackedCard): Promise<string> {
		return this.action('action-update-card', card.id, { data: card.data });
	}

	private query(query: object): Promise<DBBackedCard[]> {
		const requestOptions: Options = {
			headers: {
				authorization: this.token,
			},
			json: true,
			method: 'GET',
			url: `${this.protocol}://${this.server}:${this.port.toString()}/api/v1/query`,
			qs: query,
		};
		return request(requestOptions)
		.then((response) => {
			if (response.error) {
				throw new Error(JSON.stringify(response));
			}
			if (_.get(response, ['data', 'results', 'error'])) {
				throw new Error(JSON.stringify(response.data.results));
			}
			return response.data;
		})
		.catch((error) => {
			throw new Error(error);
		});
	}

	private action(action: string, target: string, data: object): Promise<string> {
		const requestOptions: Options = {
			headers: {
				authorization: this.token,
			},
			json: true,
			method: 'POST',
			url: `${this.protocol}://${this.server}:${this.port.toString()}/api/v1/action`,
			body: {
				action,
				target,
				arguments: {
					properties: data
				}
			}
		};
		return request(requestOptions)
		.then((response) => {
			if (response.error) {
				throw new Error(JSON.stringify(response));
			}
			if (_.get(response, ['data', 'results', 'error'])) {
				throw new Error(JSON.stringify(response.data.results));
			}
			return response.data.results.data;
		})
		.catch((error) => {
			throw new Error(error);
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
				const userId = message.user;
				const username = this.cache.usersById[userId].nick;
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
						hidden: 'NEVER',
						content: message.content.toString(),
						timestamp: message.created_at,
					},
					urls: {
						thread: `https://www.flowdock.com/app/${instance}/${flow}/threads/${thread}`,
						message: `https://www.flowdock.com/app/${instance}/${flow}/messages/${message.id.toString()}`,
						user: `http://www.flowdock.com/app/private/${userId}`,
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
			logger.info(`Received thread ${upsertInstructions.urls.thread}`);
			return store.upsertThread(upsertInstructions)
			.then(() => {
				logger.info(`Upserted thread ${upsertInstructions.urls.thread}`);
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
