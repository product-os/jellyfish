/* eslint-disable class-methods-use-this */

import Bluebird from 'bluebird';
import immutableUpdate from 'immutability-helper';
import { CallHistoryMethodAction, push } from 'connected-react-router';
import clone from 'deep-copy';
import * as jsonpatch from 'fast-json-patch';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import { v4 as isUUID } from 'is-uuid';
import * as notifications from '../../services/notifications';
import * as helpers from '../../services/helpers';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import { Action } from '../actions';
import { streamUpdate } from './stream/update';
import { streamTyping } from './stream/typing';
import type {
	Contract,
	JsonSchema,
	LoopContract,
	OrgContract,
	RelationshipContract,
	SessionContract,
	TypeContract,
	UserContract,
	ViewContract,
} from 'autumndb';
import { State } from '../reducer';
import * as selectors from '../selectors';
import { ChannelContract, UIActor } from '../../types';
import { ThunkAction, ThunkDispatch } from 'redux-thunk';
import ErrorReporter from '../../services/error-reporter';
import Analytics from '../../services/analytics';
import assert from 'assert';
import { Operation } from 'fast-json-patch';

type ThunkExtraArgs = {
	sdk: JellyfishSDK;
	analytics: Analytics;
	errorReporter: ErrorReporter;
};

type JellyThunk<R> = ThunkAction<
	R,
	State,
	ThunkExtraArgs,
	Action | CallHistoryMethodAction
>;
// Because redux dispatch doesn't know about async thunks, we need to
// define our own dispatcher that will support async thunks.
// See https://stackoverflow.com/a/59801865
export type JellyThunkDispatch = ThunkDispatch<State, ThunkExtraArgs, Action>;

// Refresh the session token once every 3 hours
const TOKEN_REFRESH_INTERVAL = 3 * 60 * 60 * 1000;

const allGroupsWithUsersQuery: JsonSchema = {
	type: 'object',
	description: 'Get all groups with member user slugs',
	$$links: {
		'has group member': {
			type: 'object',
			additionalProperties: false,
			properties: {
				active: {
					type: 'boolean',
					const: true,
				},
				slug: {
					type: 'string',
				},
			},
		},
	},
	properties: {
		type: {
			const: 'group@1.0.0',
		},
		name: {
			type: 'string',
		},
		links: {
			type: 'object',
		},
	},
	additionalProperties: false,
};

const buildGlobalQueryMask = (loop: string | null): JsonSchema | null => {
	if (!loop) {
		return null;
	}
	return {
		type: 'object',
		required: ['loop'],
		properties: {
			loop: {
				// TODO: Use a simple const once all contracts have been assigned to a loop
				enum: [loop, null],
				type: 'string',
			},
		},
	};
};

const createChannel = (data: ChannelContract['data']): ChannelContract => {
	const id = uuid();
	if (!data.hasOwnProperty('canonical')) {
		data.canonical = true;
	}

	return {
		id,
		created_at: new Date().toISOString(),
		version: '1.0.0',
		tags: [],
		markers: [],
		capabilities: [],
		requires: [],
		slug: `channel-${id}`,
		type: 'channel',
		active: true,
		data,
	};
};

let commsStream: null | ReturnType<JellyfishSDK['stream']> = null;
let tokenRefreshInterval: any = null;

// Card exists here until it's loaded
const loadingCardCache: { [key: string]: Promise<Contract | null> } = {};

// This is a function that memoizes a debounce function, this allows us to
// create different debounce lists depending on the args passed to
// 'getCard'
const getCardInternal = <T extends Contract = Contract>(
	idOrSlug: string,
	type: string,
	linkVerbs: any[] = [],
): JellyThunk<Promise<T | null>> => {
	return async (dispatch, getState, { sdk }) => {
		if (!idOrSlug) {
			return null;
		}
		const isId = isUUID(idOrSlug);
		let card = selectors.getCard<T>(idOrSlug, type)(getState());

		// Check if the cached card has all the links required by this request
		const isCached =
			card &&
			_.every(linkVerbs, (linkVerb) => {
				return !!card?.links?.[linkVerb];
			});

		if (!isCached) {
			// API requests are debounced based on the unique combination of the card ID and the (sorted) link verbs
			const linkVerbSlugs = _.orderBy(linkVerbs).map((verb) => {
				return helpers.slugify(verb);
			});
			const loadingCacheKey = [idOrSlug].concat(linkVerbSlugs).join('_');
			if (!Reflect.has(loadingCardCache, loadingCacheKey)) {
				const schema: any = {
					type: 'object',
					properties: {},
					additionalProperties: true,
				};
				if (isId) {
					schema.properties.id = {
						const: idOrSlug,
					};
				} else {
					schema.properties.slug = {
						const: idOrSlug,
					};
				}

				if (linkVerbs.length) {
					schema.$$links = {};
					for (const linkVerb of linkVerbs) {
						schema.$$links[linkVerb] = {
							type: 'object',
							additionalProperties: true,
						};
					}
				}

				loadingCardCache[loadingCacheKey] = sdk
					.query<T>(schema, {
						// TODO: Fix broken query options typing in client-sdk
						limit: 1,
					} as any)
					.then((result) => {
						if (result.length) {
							return result[0];
						}

						// If there was a card returned from the cache originally, just
						// return that one instead of making another request
						if (card) {
							return card;
						}

						return sdk.card.get(idOrSlug);
					})
					.then((element) => {
						// If a card doesn't have matching links, but a request was made
						// for them, indicate this with an empty array, so the cache entry
						// isn't ignored unnecessarily
						if (element?.links && linkVerbs.length) {
							for (const linkVerb of linkVerbs) {
								if (!element.links[linkVerb]) {
									element.links[linkVerb] = [];
								}
							}
						}

						return element;
					})
					.finally(() => {
						Reflect.deleteProperty(loadingCardCache, loadingCacheKey);
					});
			}

			card = (await loadingCardCache[loadingCacheKey]) as T | null;

			if (card) {
				dispatch({
					type: 'SET_CARD',
					value: card,
				});
			}
		}
		return card;
	};
};

export interface SeedData {
	markers?: string[];
	loop?: string;
	[key: string]: any;
}

export const getSeedData = (
	viewCard: ViewContract,
	user: UserContract,
): SeedData => {
	if (
		!viewCard ||
		(viewCard.type !== 'view' && viewCard.type !== 'view@1.0.0')
	) {
		return {};
	}
	const schema = helpers.getViewSchema(viewCard, user);
	if (!schema) {
		return {};
	}

	const activeLoop = _.get(user, ['data', 'profile', 'activeLoop'], null);

	const seed = Object.assign(helpers.getUpdateObjectFromSchema(schema), {
		// Always inherit markers from the view card
		markers: viewCard.markers,
		// Inherit the loop from the view card or the active loop
		loop: viewCard.loop || activeLoop,
	});

	// If this is a direct message view, seed the thread with the same indicators
	if (viewCard.data.dms && viewCard.data.actors) {
		_.set(seed, ['data', 'dms'], viewCard.data.dms);
		_.set(seed, ['data', 'actors'], viewCard.data.actors);
	}

	return seed;
};

export const actionCreators = {
	getIntegrationAuthUrl(state: {
		userSlug: string;
		providerSlug: string;
		returnUrl: string;
	}): JellyThunk<Promise<string>> {
		return async (_dispatch, _getState, { sdk }): Promise<string> => {
			const url = new URL(
				((await sdk.get(`/oauth/${state.providerSlug}/url`)) as any).url,
			);
			url.searchParams.set('redirect_uri', location.origin + '/oauth/callback');
			url.searchParams.set('state', JSON.stringify(state));
			return url.toString();
		};
	},

	getCard<T extends Contract = Contract>(
		cardIdOrSlug: string,
		cardType: string,
		linkVerbs: string[],
	): JellyThunk<Promise<T | null>> {
		return async (dispatch, getState, context) => {
			return getCardInternal<T>(cardIdOrSlug, cardType, linkVerbs)(
				dispatch,
				getState,
				context,
			);
		};
	},

	getActor(idOrSlug: string): JellyThunk<Promise<UIActor | null>> {
		return async (dispatch, getState, context) => {
			const card = await getCardInternal<UserContract>(idOrSlug, 'user', [
				'is member of',
			])(dispatch, getState, context);
			if (!card) {
				return null;
			}
			return helpers.generateActorFromUserCard(card);
		};
	},

	setStatus(status: State['core']['status']): JellyThunk<void> {
		return (dispatch, _getState, { sdk }) => {
			// If the status is now 'unauthorized' just run the logout routine
			if (status === 'unauthorized') {
				sdk.auth.logout();
				dispatch({
					type: 'LOGOUT',
				});
			} else {
				dispatch({
					type: 'SET_STATUS',
					value: status,
				});
			}
		};
	},

	setSidebarExpanded(name: string, isExpanded: boolean): JellyThunk<void> {
		return (dispatch, getState) => {
			const uiState = selectors.getUIState(getState());
			const newExpandedItems = isExpanded
				? uiState.sidebar.expanded.concat([name])
				: _.without(uiState.sidebar.expanded, name);
			return dispatch({
				type: 'SET_UI_STATE',
				value: immutableUpdate(uiState, {
					sidebar: {
						expanded: {
							$set: newExpandedItems,
						},
					},
				}),
			});
		};
	},

	setLensState(
		lens: string,
		cardId: string,
		state: { activeIndex: number },
	): Action {
		return {
			type: 'SET_LENS_STATE',
			value: {
				lens,
				cardId,
				state,
			},
		};
	},

	createChannelQuery(target: string, user: UserContract): JsonSchema {
		let properties = {};
		if (isUUID(target)) {
			properties = {
				id: {
					const: target,
				},
			};
		} else {
			const [slug, version] = target.split('@');
			properties = {
				slug: {
					const: slug,
				},

				// We MUST specify the version otherwise the query will return all versions
				// and randomly show one of them
				version: {
					const: version || '1.0.0',
				},
			};
		}

		const query: JsonSchema = {
			type: 'object',
			anyOf: [
				{
					$$links: {
						'is bookmarked by': {
							type: 'object',
							required: ['type', 'id'],
							properties: {
								type: {
									const: 'user@1.0.0',
								},
								id: {
									const: user.id,
								},
							},
						},
					},
				},
				{
					$$links: {
						'has attached element': {
							type: 'object',
						},
					},
				},
				true,
			],
			properties,
		};
		return query;
	},

	updateChannel(channel: ChannelContract): Action {
		return {
			type: 'UPDATE_CHANNEL',
			value: channel,
		};
	},

	addChannel(data: ChannelContract['data']): JellyThunk<void> {
		if (!data.cardType && data.canonical !== false) {
			console.error('Channel added without a card type', data);
		}
		const channel = createChannel(data);

		return (dispatch) => {
			return dispatch({
				type: 'ADD_CHANNEL',
				value: channel,
			});
		};
	},

	removeChannel(channel: ChannelContract): Action {
		return {
			type: 'REMOVE_CHANNEL',
			value: channel,
		};
	},

	// TODO: The mixing of types here is an abomination, fix it!
	setChannels(
		channelData: Array<ChannelContract | ChannelContract['data']> = [],
	): JellyThunk<void> {
		const channels: ChannelContract[] = _.map(channelData, (channel) => {
			// If the channel has an ID its already been instantiated
			if (channel.hasOwnProperty('id')) {
				return channel as ChannelContract;
			}

			// Otherwise we're just dealing with the `data` value and need to create
			// a full channel card
			return createChannel(channel as ChannelContract['data']);
		});

		return (dispatch, getState) => {
			const state = getState();
			const currentChannels = selectors.getChannels()(state);

			// For each current channel that isn't in the new channels, remove the corresponding stream
			const diff = _.differenceBy(currentChannels, channels, 'data.target');
			for (const removedChannel of diff) {
				dispatch(actionCreators.removeChannel(removedChannel));
			}
			dispatch({
				type: 'SET_CHANNELS',
				value: channels,
			});
		};
	},

	openCreateChannel(
		sourceCard: Contract,
		types: TypeContract[],
		options: any = {},
	): JellyThunk<void> {
		return (dispatch, getState) => {
			const state = getState();
			const user = selectors.getCurrentUser()(state);
			assert(user);
			dispatch(
				actionCreators.addChannel({
					head: options.head || {
						types,
						seed: getSeedData(sourceCard, user),
						onDone: {
							action: 'open',
						},
					},
					format: 'create',
					canonical: false,
				}),
			);
		};
	},

	setChatWidgetOpen(open: boolean): JellyThunk<void> {
		return (dispatch, getState) => {
			const uiState = getState().ui;

			dispatch({
				type: 'SET_UI_STATE',
				value: {
					...uiState,
					chatWidget: {
						open,
					},
				},
			});
		};
	},

	setMentionsCount(count: number): Action {
		return {
			type: 'SET_MENTIONS_COUNT',
			value: count,
		};
	},

	bootstrap(): JellyThunk<Promise<UserContract | void>> {
		return (dispatch, getState, { sdk, errorReporter }) => {
			return sdk.auth.whoami<UserContract>().then((user) => {
				if (!user) {
					throw new Error('Could not retrieve user');
				}
				sdk.globalQueryMask = buildGlobalQueryMask(
					_.get(user, ['data', 'profile', 'activeLoop'], null),
				);
				return Promise.all([
					sdk.card.getAllByType<LoopContract>('loop'),
					sdk.card.getAllByType<OrgContract>('org'),
					sdk.card.getAllByType<TypeContract>('type'),
					sdk.card.getAllByType<RelationshipContract>('relationship'),
					sdk.query(allGroupsWithUsersQuery),
					sdk.getConfig(),
				]).then(async ([loops, orgs, types, relationships, groups, config]) => {
					const state = getState();

					// Check to see if we're still logged in
					if (selectors.getSessionToken()(state)) {
						dispatch(actionCreators.setLoops(loops));
						dispatch(actionCreators.setUser(user));
						dispatch(actionCreators.setTypes(types));
						dispatch(actionCreators.setRelationships(relationships));
						dispatch(actionCreators.setOrgs(orgs));
						dispatch(actionCreators.setGroups(groups, user));
						dispatch({
							type: 'SET_CONFIG',
							value: config,
						});
					}

					errorReporter.setUser({
						id: user.id,
						slug: user.slug,
						email: _.get(user, ['data', 'email']) as string,
					});

					// Check token expiration and refresh it if it is due to expire in the next 24 hours
					sdk.card
						.get<SessionContract>(sdk.getAuthToken()!)
						.then((tokenCard) => {
							if (
								tokenCard?.data.expiration &&
								new Date(tokenCard.data.expiration).getTime() <
									Date.now() + 1000 * 60 * 60 * 24
							) {
								return sdk.auth.refreshToken();
							}
						})
						.catch(console.error);

					tokenRefreshInterval = setInterval(async () => {
						const newToken = await sdk.auth.refreshToken();
						dispatch(actionCreators.setAuthToken(newToken));
					}, TOKEN_REFRESH_INTERVAL);

					if (commsStream) {
						commsStream.close();
					}

					// Open a stream for messages, whispers and uses. This allows us to
					// listen for message edits, sync status, alerts/pings and changes in
					// other users statuses
					commsStream = sdk.stream({
						type: 'object',
						properties: {
							type: {
								type: 'string',
								enum: [
									'message@1.0.0',
									'whisper@1.0.0',
									'summary@1.0.0',
									'rating@1.0.0',
									'user@1.0.0',
								],
							},
						},
						required: ['type'],
					});

					commsStream.on('update', (payload) =>
						streamUpdate(payload, getState, dispatch, user, types),
					);

					// TODO handle typing notifications in a more generic way, this is an
					// abomination. (A small abomination, but still an abomination)
					commsStream.on('typing', (payload) =>
						streamTyping(dispatch, payload),
					);

					commsStream.on('connect_error', (error) => {
						console.error('A stream error occurred', error);
					});

					return user;
				});
			});
		};
	},

	setAuthToken(token: string): Action {
		return {
			type: 'SET_AUTHTOKEN',
			value: token,
		};
	},

	loginWithToken(token: string): JellyThunk<Promise<void>> {
		return (dispatch, getState, { sdk, analytics }) => {
			return sdk.auth
				.loginWithToken(token)
				.then(() => {
					return dispatch(actionCreators.setAuthToken(token));
				})
				.then(() => {
					return dispatch(actionCreators.bootstrap());
				})
				.then(() => {
					return dispatch(actionCreators.setStatus('authorized'));
				})
				.then(() => {
					analytics.track('ui.loginWithToken');
					const user = selectors.getCurrentUser()(getState());
					assert(user);
					analytics.identify(user.id);
				})
				.catch((error) => {
					dispatch(actionCreators.setStatus('unauthorized'));
					throw error;
				});
		};
	},

	login(payload: {
		username: string;
		password: string;
	}): JellyThunk<Promise<void>> {
		return (dispatch, getState, { sdk, analytics }) => {
			return sdk.auth
				.login(payload)
				.then((session) => {
					if (!session) {
						throw new Error('No session returned');
					}
					return dispatch(actionCreators.setAuthToken(session.id));
				})
				.then(() => {
					return dispatch(actionCreators.bootstrap());
				})
				.then(() => {
					return dispatch(actionCreators.setStatus('authorized'));
				})
				.then(() => {
					analytics.track('ui.login');
					const user = selectors.getCurrentUser()(getState());
					assert(user);
					analytics.identify(user.id);
				})
				.catch((error) => {
					dispatch(actionCreators.setStatus('unauthorized'));
					throw error;
				});
		};
	},

	logout(): JellyThunk<void> {
		return (dispatch, _getState, { sdk, analytics, errorReporter }) => {
			if (tokenRefreshInterval) {
				clearInterval(tokenRefreshInterval);
			}

			analytics.track('ui.logout');
			analytics.identify();
			errorReporter.setUser(null);
			if (commsStream) {
				commsStream.close();
				commsStream = null;
				sdk.auth.logout();
			}
			dispatch({
				type: 'LOGOUT',
			});
		};
	},

	signup(payload: {
		username: string;
		password: string;
		email: string;
	}): JellyThunk<Promise<void>> {
		return async (dispatch, _getState, { sdk, analytics }) => {
			await sdk.auth.signup(payload);
			analytics.track('ui.signup');
			return dispatch(actionCreators.login(payload));
		};
	},

	setUser(user: UserContract): Action {
		return {
			type: 'SET_USER',
			value: user,
		};
	},

	setTimelineMessage(target: string, message: Contract): JellyThunk<void> {
		return (dispatch) => {
			dispatch({
				type: 'SET_TIMELINE_MESSAGE',
				value: {
					target,
					message,
				},
			});
		};
	},

	setTimelinePendingMessages(
		target: string,
		messages: Contract[],
	): JellyThunk<void> {
		return (dispatch) => {
			dispatch({
				type: 'SET_TIMELINE_PENDING_MESSAGES',
				value: {
					target,
					messages,
				},
			});
		};
	},

	setTypes(types: TypeContract[]): Action {
		return {
			type: 'SET_TYPES',
			value: types,
		};
	},

	setRelationships(relationships: RelationshipContract[]): Action {
		return {
			type: 'SET_RELATIONSHIPS',
			value: relationships,
		};
	},

	setLoops(loops: LoopContract[]): Action {
		return {
			type: 'SET_LOOPS',
			value: loops,
		};
	},

	setGroups(groups: Contract[], user: UserContract): Action {
		return {
			type: 'SET_GROUPS',
			value: {
				groups,
				userSlug: user.slug,
			},
		};
	},

	setOrgs(orgs: OrgContract[]): Action {
		return {
			type: 'SET_ORGS',
			value: orgs,
		};
	},

	removeView(view: ViewContract): JellyThunk<Promise<void>> {
		return async (dispatch, getState, { sdk }) => {
			try {
				const user = selectors.getCurrentUser()(getState());
				assert(user);
				if (!helpers.isCustomView(view, user.slug)) {
					notifications.addNotification(
						'danger',
						'You do not have permission to delete this view',
					);
					return;
				}

				// First remove any matching view channels - if found
				const state = getState();
				const matchingChannels = _.filter(state.core.channels, (channel) => {
					return _.get(channel, ['data', 'target']) === view.slug;
				});
				if (matchingChannels.length) {
					const removeChannelActions = _.map(matchingChannels, (channel) => {
						return dispatch(actionCreators.removeChannel(channel));
					});
					await (Bluebird as any).all(removeChannelActions);
				}

				// Then remove the card via the SDK
				await sdk.card.remove(view.id, view.type);

				notifications.addNotification('success', 'Successfully deleted view');
			} catch (err) {
				console.error('Failed to remove view', err);
				notifications.addNotification('danger', 'Could not remove view');
			}
		};
	},

	setActiveLoop(loopVersionedSlug: string | null): JellyThunk<Promise<void>> {
		return async (dispatch, getState, context) => {
			const state = getState();
			const user = selectors.getCurrentUser()(state);
			assert(user);
			const patches = helpers.patchPath(
				user,
				['data', 'profile', 'activeLoop'],
				loopVersionedSlug,
			);
			const [activeLoopSlug, activeLoopVersion] = (
				loopVersionedSlug || ''
			).split('@');
			const activeLoop = _.find(selectors.getLoops()(state), {
				slug: activeLoopSlug,
				version: activeLoopVersion,
			});
			const successNotification = activeLoop
				? `Active loop is now '${activeLoop.name}'`
				: 'No active loop';
			await actionCreators.updateUser(patches, successNotification)(
				dispatch,
				getState,
				context,
			);
			await actionCreators.bootstrap()(dispatch, getState, context);
		};
	},

	pushLocation(location: string): JellyThunk<void> {
		return (dispatch) => {
			dispatch(push(location));
		};
	},

	updateUser(
		patches: Operation[],
		successNotification?: string | null,
	): JellyThunk<Promise<void>> {
		return async (dispatch, getState, { sdk }) => {
			try {
				const user = selectors.getCurrentUser()(getState());

				assert(user);

				const optimisticUpdate = jsonpatch.applyPatch(
					clone(user),
					clone(patches),
				).newDocument;

				sdk.globalQueryMask = buildGlobalQueryMask(
					_.get(optimisticUpdate, ['data', 'profile', 'activeLoop'], null),
				);

				// Optimistically update the user in local state
				await dispatch(actionCreators.setUser(optimisticUpdate));

				await sdk.card.update(user.id, 'user', patches);

				if (successNotification !== null) {
					notifications.addNotification(
						'success',
						successNotification || 'Successfully updated user',
					);
				}
			} catch (error: any) {
				notifications.addNotification('danger', error.message || error);
			}
		};
	},

	addUser({
		username,
		email,
		org,
	}: {
		username: string;
		email: string;
		org?: OrgContract;
	}): JellyThunk<Promise<boolean>> {
		return async (dispatch, _getState, { sdk }) => {
			try {
				const user = await sdk.auth.signup<UserContract>({
					username,
					email,
					password: '',
				});
				if (org) {
					await dispatch(actionCreators.createLink(org, user, 'has member'));
				}
				const loginLinkSent = await dispatch(
					actionCreators.sendFirstTimeLoginLink({
						user,
					}),
				);
				if (loginLinkSent) {
					notifications.addNotification('success', 'Successfully created user');
					return true;
				}
				return false;
			} catch (error: any) {
				notifications.addNotification('danger', error.message);
				return false;
			}
		};
	},

	sendFirstTimeLoginLink({
		user,
	}: {
		user: UserContract;
	}): JellyThunk<Promise<boolean>> {
		return async (_dispatch, _getState, { sdk }) => {
			try {
				await sdk.action({
					card: user.id,
					action: 'action-send-first-time-login-link@1.0.0',
					type: user.type,
					arguments: {},
				});
				notifications.addNotification(
					'success',
					'Sent first-time login token to user',
				);
				return true;
			} catch (error: any) {
				notifications.addNotification('danger', error.message);
				return false;
			}
		};
	},

	requestPasswordReset({
		username,
	}: {
		username: string;
	}): JellyThunk<Promise<void>> {
		return async (_dispatch, _getState, { sdk }) => {
			return sdk.auth.requestPasswordReset(username);
		};
	},

	completePasswordReset({
		password,
		resetToken,
	}: {
		password: string;
		resetToken: string;
	}): JellyThunk<Promise<void>> {
		return async (_dispatch, _getState, { sdk }) => {
			return sdk.auth.completePasswordReset(password, resetToken);
		};
	},

	completeFirstTimeLogin({
		password,
		firstTimeLoginToken,
	}: {
		password: string;
		firstTimeLoginToken: string;
	}): JellyThunk<Promise<void>> {
		return async (_dispatch, _getState, { sdk }) => {
			return sdk.auth.completeFirstTimeLogin(password, firstTimeLoginToken);
		};
	},

	setPassword(
		currentPassword: string,
		newPassword: string,
	): JellyThunk<Promise<void>> {
		return async (_dispatch, getState, { sdk }) => {
			try {
				const user = selectors.getCurrentUser()(getState());
				assert(user);
				await sdk.action({
					card: user.id,
					action: 'action-set-password@1.0.0',
					type: user.type,
					arguments: {
						currentPassword,
						newPassword,
					},
				});

				notifications.addNotification(
					'success',
					'Successfully changed password',
				);
			} catch (error: any) {
				notifications.addNotification('danger', error.message || error);
			}
		};
	},

	setSendCommand(command: string): JellyThunk<Promise<void>> {
		return async (dispatch, getState, context) => {
			const user = selectors.getCurrentUser()(getState());
			assert(user);

			const patches = helpers.patchPath(
				user,
				['data', 'profile', 'sendCommand'],
				command,
			);

			return actionCreators.updateUser(
				patches,
				`Successfully set "${command}" as send command`,
			)(dispatch, getState, context);
		};
	},

	createLink(
		fromCard: Contract,
		toCard: Contract,
		verb: string,
		options: {
			skipSuccessMessage?: boolean;
		} = {},
	): JellyThunk<Promise<void>> {
		return async (_dispatch, _getState, { sdk, analytics }) => {
			try {
				await sdk.card.link(fromCard, toCard, verb);
				analytics.track('element.create', {
					element: {
						type: 'link',
					},
				});
				if (!options.skipSuccessMessage) {
					notifications.addNotification('success', 'Created new link');
				}
			} catch (error: any) {
				notifications.addNotification('danger', error.message);
			}
		};
	},

	removeLink(
		fromCard: Contract,
		toCard: Contract,
		verb: string,
		options: {
			skipSuccessMessage?: boolean;
		} = {},
	): JellyThunk<Promise<void>> {
		return async (_dispatch, _getState, { sdk }) => {
			try {
				await sdk.card.unlink(fromCard, toCard, verb);
				if (!options.skipSuccessMessage) {
					notifications.addNotification('success', 'Removed link');
				}
			} catch (error: any) {
				notifications.addNotification('danger', error.message);
			}
		};
	},

	dumpState(): JellyThunk<State> {
		return (_dispatch, getState) => {
			const state = clone(getState());
			_.set(state, ['core', 'session', 'authToken'], '[REDACTED]');
			_.set(state, ['core', 'session', 'user', 'data', 'hash'], '[REDACTED]');

			return state;
		};
	},

	setDefault(card: Contract): JellyThunk<Promise<void>> {
		return (dispatch, getState, context) => {
			const user = selectors.getCurrentUser()(getState());

			assert(user);

			const patch = helpers.patchPath(
				user,
				['data', 'profile', 'homeView'],
				// eslint-disable-next-line no-undefined
				_.get(card, ['id'], undefined),
			);

			const successNotification = card
				? `Set ${card.name || card.slug} as default view`
				: 'Removed default view';

			return actionCreators.updateUser(patch, successNotification)(
				dispatch,
				getState,
				context,
			);
		};
	},

	setViewLens(viewId: string, lensSlug: string): JellyThunk<Promise<void>> {
		return (dispatch, getState, context) => {
			const user = selectors.getCurrentUser()(getState());
			assert(user);

			const patches = helpers.patchPath(
				user,
				['data', 'profile', 'viewSettings', viewId, 'lens'],
				lensSlug,
			);

			return actionCreators.updateUser(patches, null)(
				dispatch,
				getState,
				context,
			);
		};
	},

	setViewSlice(viewId: string, slice: string): JellyThunk<void> {
		return (dispatch, getState, context) => {
			const user = selectors.getCurrentUser()(getState());
			assert(user);

			const patches = helpers.patchPath(
				user,
				['data', 'profile', 'viewSettings', viewId, 'slice'],
				slice,
			);

			return actionCreators.updateUser(patches, null)(
				dispatch,
				getState,
				context,
			);
		};
	},

	setUserCustomFilters(contractId: string, filters: JsonSchema[]): Action {
		return {
			type: 'SET_USER_CUSTOM_FILTERS',
			value: {
				id: contractId,
				data: filters,
			},
		};
	},

	signalTyping(card: Contract): JellyThunk<void> {
		return (_dispatch, getState) => {
			const user = selectors.getCurrentUser()(getState());
			assert(user);

			if (commsStream?.type) {
				// TODO: Fix casting once https://github.com/product-os/jellyfish-client-sdk/pull/660 is merged
				(commsStream as any).type(user.slug, card);
			}
		};
	},

	authorizeIntegration(
		user: UserContract,
		integration: string,
		code: string,
	): JellyThunk<Promise<void>> {
		return async (dispatch, _getState, { sdk }) => {
			await sdk.integrations.authorize(user, integration, code);

			const updatedUser: UserContract = await sdk.auth.whoami();

			dispatch(actionCreators.setUser(updatedUser));
		};
	},

	setImageSrc(
		contractId: string,
		name: string,
		mimeType: string,
	): JellyThunk<Promise<void>> {
		return async (dispatch, _getState, { sdk }) => {
			const data = await sdk.getFile(contractId, name);
			const blob = new Blob([data], {
				type: mimeType,
			});
			const src = URL.createObjectURL(blob);

			dispatch({
				type: 'SET_IMAGE',
				value: {
					contractId,
					name,
					src,
				},
			});
		};
	},
};
