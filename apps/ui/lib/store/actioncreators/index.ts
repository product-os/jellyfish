/* eslint-disable class-methods-use-this */

import Bluebird from 'bluebird';
import immutableUpdate from 'immutability-helper';
import { push } from 'connected-react-router';
import clone from 'deep-copy';
import * as jsonpatch from 'fast-json-patch';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import { v4 as isUUID } from 'is-uuid';
import * as notifications from '../../services/notifications';
import * as helpers from '../../services/helpers';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import actions from '../actions';
import { streamUpdate } from './stream/update';
import { streamTyping } from './stream/typing';
import type {
	JsonSchema,
	LoopContract,
	UserContract,
	ViewContract,
} from 'autumndb';
import * as selectors from '../selectors';
import { ChannelContract } from '../../types';

// Refresh the session token once every 3 hours
const TOKEN_REFRESH_INTERVAL = 3 * 60 * 60 * 1000;

const allGroupsWithUsersQuery = {
	type: 'object',
	description: 'Get all groups with member user slugs',
	required: ['type', 'name'],
	$$links: {
		'has group member': {
			type: 'object',
			required: ['slug', 'active'],
			properties: {
				active: {
					type: 'boolean',
					const: true,
				},
				slug: {
					type: 'string',
				},
			},
			additionalProperties: false,
		},
	},
	properties: {
		type: {
			const: 'group@1.0.0',
		},
	},
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

const createChannel = (data: any = {}) => {
	const id = uuid();
	if (!data.hasOwnProperty('canonical')) {
		data.canonical = true;
	}

	return {
		id,
		created_at: new Date().toISOString(),
		slug: `channel-${id}`,
		type: 'channel',
		active: true,
		data,
	};
};

let commsStream: any = null;
let tokenRefreshInterval: any = null;

// Card exists here until it's loaded
const loadingCardCache: any = {};

// This is a function that memoizes a debounce function, this allows us to
// create different debounce lists depending on the args passed to
// 'getCard'
const getCardInternal = (
	idOrSlug: string,
	type: string,
	linkVerbs: any[] = [],
) => {
	return async (dispatch, getState, { sdk }) => {
		if (!idOrSlug) {
			return null;
		}
		const isId = isUUID(idOrSlug);
		let card = selectors.getCard(idOrSlug, type)(getState());

		// Check if the cached card has all the links required by this request
		const isCached =
			card &&
			_.every(linkVerbs, (linkVerb) => {
				return Boolean(_.get(card, ['links'], {})[linkVerb]);
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
					.query(schema, {
						limit: 1,
					})
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
						if (element && linkVerbs.length) {
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

			card = await loadingCardCache[loadingCacheKey];

			if (card) {
				dispatch({
					type: actions.SET_CARD,
					value: card,
				});
			}
		}
		return card || null;
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

	return Object.assign(helpers.getUpdateObjectFromSchema(schema), {
		// Always inherit markers from the view card
		markers: viewCard.markers,
		// Inherit the loop from the view card or the active loop
		loop: viewCard.loop || activeLoop,
	});
};

export const actionCreators = {
	getIntegrationAuthUrl(state: {
		userSlug: string;
		providerSlug: string;
		returnUrl: string;
	}) {
		return async (_dispatch, _getState, { sdk }) => {
			const url = new URL(
				(await sdk.get(`/oauth/${state.providerSlug}/url`)).url,
			);
			url.searchParams.set('redirect_uri', location.origin + '/oauth/callback');
			url.searchParams.set('state', JSON.stringify(state));
			return url.toString();
		};
	},

	getCard(cardIdOrSlug, cardType, linkVerbs) {
		return async (dispatch, getState, context) => {
			return getCardInternal(cardIdOrSlug, cardType, linkVerbs)(
				dispatch,
				getState,
				context,
			);
		};
	},

	getActor(idOrSlug) {
		return async (dispatch, getState, context) => {
			const card = await getCardInternal(idOrSlug, 'user', ['is member of'])(
				dispatch,
				getState,
				context,
			);
			return helpers.generateActorFromUserCard(card);
		};
	},

	setStatus(status) {
		return (dispatch, _getState, { sdk }) => {
			// If the status is now 'unauthorized' just run the logout routine
			if (status === 'unauthorized') {
				sdk.auth.logout();
				dispatch({
					type: actions.LOGOUT,
				});
			} else {
				dispatch({
					type: actions.SET_STATUS,
					value: status,
				});
			}
		};
	},

	setSidebarExpanded(name: string, isExpanded: boolean) {
		return (dispatch, getState) => {
			const uiState = selectors.getUIState(getState());
			const newExpandedItems = isExpanded
				? uiState.sidebar.expanded.concat([name])
				: _.without(uiState.sidebar.expanded, name);
			return dispatch({
				type: actions.SET_UI_STATE,
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

	setLensState(lens, cardId, state) {
		return {
			type: actions.SET_LENS_STATE,
			value: {
				lens,
				cardId,
				state,
			},
		};
	},

	// TODO: This is NOT an action creator, it should be part of sdk or other helper
	getLinks({ sdk }: { sdk: JellyfishSDK }, card, verb, targetType) {
		let baseTargetType = targetType && helpers.getTypeBase(targetType);
		let linkedType = targetType;

		// Link constraints allow '*' to indicate any type
		if (targetType === 'undefined@1.0.0') {
			// eslint-disable-next-line no-undefined
			linkedType = undefined;
			baseTargetType = '*';
		}
		if (
			!_.some(sdk.LINKS, {
				name: verb,
				data: {
					to: baseTargetType,
				},
			})
		) {
			throw new Error(
				`No link definition found from ${card.type} to ${baseTargetType} using ${verb}`,
			);
		}

		return async () => {
			const results = await sdk.query(
				{
					$$links: {
						[verb]: {
							type: 'object',
							required: ['type'],
							properties: {
								type: {
									const: linkedType,
								},
							},
							// Always load the owner if there is one
							anyOf: [
								{
									$$links: {
										'is owned by': {
											type: 'object',
										},
									},
								},
								true,
							],
						},
					},
					description: `Get card with links ${card.id}`,
					type: 'object',
					properties: {
						id: {
							type: 'string',
							const: card.id,
						},
						links: {
							type: 'object',
						},
					},
					required: ['id'],
				},
				{
					limit: 1,
					links: {
						[verb]: {
							sortBy: 'created_at',
						},
					},
				},
			);

			if (results.length && results[0].links) {
				return results[0].links[verb] || [];
			}

			return [];
		};
	},

	createChannelQuery(target, user): any {
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

		const query = {
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

	updateChannel(channel: ChannelContract) {
		return {
			type: actions.UPDATE_CHANNEL,
			value: channel,
		};
	},

	addChannel(data: ChannelContract['data']) {
		if (!data.cardType && data.canonical !== false) {
			console.error('Channel added without a card type', data);
		}
		const channel = createChannel(data);

		return (dispatch) => {
			return dispatch({
				type: actions.ADD_CHANNEL,
				value: channel,
			});
		};
	},

	removeChannel(channel) {
		return {
			type: actions.REMOVE_CHANNEL,
			value: channel,
		};
	},

	setChannels(channelData: any[] = []) {
		const channels = _.map(channelData, (channel) => {
			// If the channel has an ID its already been instantiated
			if (channel.id) {
				return channel;
			}

			// Otherwise we're just dealing with the `data` value and need to create
			// a full channel card
			return createChannel(channel);
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
				type: actions.SET_CHANNELS,
				value: channels,
			});
		};
	},

	openCreateChannel(sourceCard, types, options: any = {}) {
		return (dispatch, getState) => {
			const state = getState();
			const user = selectors.getCurrentUser()(state);
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

	setChatWidgetOpen(open) {
		return (dispatch, getState) => {
			const uiState = getState().ui;

			dispatch({
				type: actions.SET_UI_STATE,
				value: {
					...uiState,
					chatWidget: {
						open,
					},
				},
			});
		};
	},

	setMentionsCount(count) {
		return {
			type: actions.SET_MENTIONS_COUNT,
			value: count,
		};
	},

	bootstrap() {
		return (dispatch, getState, { sdk, errorReporter }) => {
			return sdk.auth.whoami().then((user) => {
				if (!user) {
					throw new Error('Could not retrieve user');
				}
				sdk.globalQueryMask = buildGlobalQueryMask(
					_.get(user, ['data', 'profile', 'activeLoop'], null),
				);
				return (Bluebird as any)
					.props({
						loops: sdk.card.getAllByType('loop'),
						orgs: sdk.card.getAllByType('org'),
						types: sdk.card.getAllByType('type'),
						groups: sdk.query(allGroupsWithUsersQuery),
						config: sdk.getConfig(),
					})
					.then(async ({ loops, types, groups, orgs, config }) => {
						const state = getState();

						// Check to see if we're still logged in
						if (selectors.getSessionToken()(state)) {
							dispatch(actionCreators.setLoops(loops));
							dispatch(actionCreators.setUser(user));
							dispatch(actionCreators.setTypes(types));
							dispatch(actionCreators.setOrgs(orgs));
							dispatch(actionCreators.setGroups(groups, user));
							dispatch({
								type: actions.SET_CONFIG,
								value: config,
							});
						}

						errorReporter.setUser({
							id: user.id,
							slug: user.slug,
							email: _.get(user, ['data', 'email']),
						});

						// Check token expiration and refresh it if it is due to expire in the next 24 hours
						sdk.card.get(sdk.getAuthToken()).then((tokenCard) => {
							if (
								tokenCard &&
								tokenCard.data.expiration &&
								new Date(tokenCard.data.expiration).getTime() <
									Date.now() + 1000 * 60 * 60 * 24
							) {
								sdk.auth.refreshToken();
							}
						});

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

	setAuthToken(token) {
		return {
			type: actions.SET_AUTHTOKEN,
			value: token,
		};
	},

	loginWithToken(token) {
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
					analytics.identify(selectors.getCurrentUser()(getState()).id);
				})
				.catch((error) => {
					dispatch(actionCreators.setStatus('unauthorized'));
					throw error;
				});
		};
	},

	login(payload) {
		return (dispatch, getState, { sdk, analytics }) => {
			return sdk.auth
				.login(payload)
				.then((session) => {
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
					analytics.identify(selectors.getCurrentUser()(getState()).id);
				})
				.catch((error) => {
					dispatch(actionCreators.setStatus('unauthorized'));
					throw error;
				});
		};
	},

	logout() {
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
				type: actions.LOGOUT,
			});
		};
	},

	signup(payload) {
		return (dispatch, _getState, { sdk, analytics }) => {
			return sdk.auth.signup(payload).then(() => {
				analytics.track('ui.signup');
				dispatch(actionCreators.login(payload));
			});
		};
	},

	setUser(user) {
		return {
			type: actions.SET_USER,
			value: user,
		};
	},

	setTimelineMessage(target, message) {
		return (dispatch) => {
			dispatch({
				type: actions.SET_TIMELINE_MESSAGE,
				value: {
					target,
					message,
				},
			});
		};
	},

	setTimelinePendingMessages(target, messages) {
		return (dispatch) => {
			dispatch({
				type: actions.SET_TIMELINE_PENDING_MESSAGES,
				value: {
					target,
					messages,
				},
			});
		};
	},

	setTypes(types) {
		return {
			type: actions.SET_TYPES,
			value: types,
		};
	},

	setLoops(loops: LoopContract[]) {
		return {
			type: actions.SET_LOOPS,
			value: loops,
		};
	},

	setGroups(groups, user) {
		return {
			type: actions.SET_GROUPS,
			value: {
				groups,
				userSlug: user.slug,
			},
		};
	},

	setOrgs(orgs) {
		return {
			type: actions.SET_ORGS,
			value: orgs,
		};
	},

	removeView(view) {
		return async (dispatch, getState, { sdk }) => {
			try {
				const user = selectors.getCurrentUser()(getState());
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

	setActiveLoop(loopVersionedSlug: string | null) {
		return async (dispatch, getState, context) => {
			const state = getState();
			const user = selectors.getCurrentUser()(state);
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
			actionCreators.bootstrap()(dispatch, getState, context);
			// TODO: Ideally we should just re-query all existing streams and we won't need
			// this redirect to 'reset' the UI.
			dispatch(push('/'));
		};
	},

	pushLocation(location: string) {
		return (dispatch) => {
			dispatch(push(location));
		};
	},

	updateUser(patches, successNotification?: string | null) {
		return async (dispatch, getState, { sdk }) => {
			try {
				const user = selectors.getCurrentUser()(getState());

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

	addUser({ username, email, org }) {
		return async (dispatch, _getState, { sdk }) => {
			try {
				const user = await sdk.auth.signup({
					username,
					email,
					password: '',
				});
				await dispatch(actionCreators.createLink(org, user, 'has member'));
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

	sendFirstTimeLoginLink({ user }) {
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

	requestPasswordReset({ username }) {
		return async (_dispatch, _getState, { sdk }) => {
			return sdk.auth.requestPasswordReset(username);
		};
	},

	completePasswordReset({ password, resetToken }) {
		return async (_dispatch, _getState, { sdk }) => {
			return sdk.auth.completePasswordReset(password, resetToken);
		};
	},

	completeFirstTimeLogin({ password, firstTimeLoginToken }) {
		return async (_dispatch, _getState, { sdk }) => {
			return sdk.auth.completeFirstTimeLogin(password, firstTimeLoginToken);
		};
	},

	setPassword(currentPassword, newPassword) {
		return async (_dispatch, getState, { sdk }) => {
			try {
				const user = selectors.getCurrentUser()(getState());
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

	setSendCommand(command) {
		return async (dispatch, getState, context) => {
			const user = selectors.getCurrentUser()(getState());

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

	createLink(fromCard, toCard, verb, options: any = {}) {
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

	removeLink(fromCard, toCard, verb, options: any = {}) {
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

	dumpState() {
		return async (_dispatch, getState) => {
			const state = clone(getState());
			_.set(state, ['core', 'session', 'authToken'], '[REDACTED]');
			_.set(state, ['core', 'session', 'user', 'data', 'hash'], '[REDACTED]');

			return state;
		};
	},

	setDefault(card) {
		return (dispatch, getState, context) => {
			const user = selectors.getCurrentUser()(getState());

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

	setViewLens(viewId, lensSlug) {
		return (dispatch, getState, context) => {
			const user = selectors.getCurrentUser()(getState());

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

	setViewSlice(viewId, slice) {
		return (dispatch, getState, context) => {
			const user = selectors.getCurrentUser()(getState());

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

	setUserCustomFilters(contractId: string, filters: JsonSchema[]) {
		return {
			type: actions.SET_USER_CUSTOM_FILTERS,
			value: {
				id: contractId,
				data: filters,
			},
		};
	},

	signalTyping(card) {
		return (_dispatch, getState) => {
			const user = selectors.getCurrentUser()(getState());

			commsStream.type(user.slug, card);
		};
	},

	authorizeIntegration(user, integration, code) {
		return async (dispatch, _getState, { sdk }) => {
			await sdk.integrations.authorize(user, integration, code);

			const updatedUser = await sdk.auth.whoami();

			dispatch(actionCreators.setUser(updatedUser));
		};
	},
};
