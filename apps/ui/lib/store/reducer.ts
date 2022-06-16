import clone from 'deep-copy';
import update from 'immutability-helper';
import storage from 'localforage';
import { persistReducer } from 'redux-persist';
import { connectRouter } from 'connected-react-router';
import _ from 'lodash';
import * as redux from 'redux';
import { v4 as uuid } from 'uuid';
import actions from './actions';
import history from '../services/history';
import { ChannelContract } from '../types';
import {
	Contract,
	LoopContract,
	OrgContract,
	TypeContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';
import { JsonSchema } from '@balena/jellyfish-types';

// Set localStorage as the backend driver, as it is a little easier to work
// with.
// In memory storage should be used as a fallback if localStorage isn't
// available for some reason.
if (global.localStorage) {
	storage.setDriver(storage.LOCALSTORAGE);
}

export interface AccountsMap {
	[slug: string]: string;
}

// Interface for defaultState
export interface State {
	core: {
		status: 'initializing' | 'unauthorized' | 'authorized';
		accounts: AccountsMap;
		selectedAccount: string | null;
		defaultAccount: string | null;
		currentUser: UserContract | null;
		mentionsCount: number;
		channels: ChannelContract[];
		types: TypeContract[];
		loops: LoopContract[];
		groups: {};
		cards: {};
		orgs: OrgContract[];
		config: {};
		userCustomFilters: { [contractId: string]: JsonSchema[] };
		usersTyping: {
			[contractId: string]: {
				[slug: string]: boolean;
			};
		};
	};
	ui: {
		lensState: {};
		sidebar: {
			expanded: string[];
		};
		timelines: {
			[contractId: string]: {
				message?: string;
				pending?: Array<Partial<Contract>>;
			};
		};
		chatWidget: {
			open: boolean;
		};
	};
}

export const defaultState: State = {
	core: {
		status: 'initializing',
		accounts: {},
		selectedAccount: null,
		defaultAccount: null,
		currentUser: null,
		mentionsCount: 0,
		channels: [
			{
				id: uuid(),
				created_at: new Date().toISOString(),
				slug: `channel-${uuid()}`,
				type: 'channel',
				version: '1.0.0',
				tags: [],
				markers: [],
				links: {},
				requires: [],
				capabilities: [],
				active: true,
				data: {
					target: 'view-all-views',
					cardType: 'view',
				},
			},
		],
		types: [],
		loops: [],
		groups: {},
		cards: {},
		orgs: [],
		config: {},
		userCustomFilters: {},
		usersTyping: {},
	},
	ui: {
		lensState: {},
		sidebar: {
			expanded: [],
		},
		timelines: {},
		chatWidget: {
			open: false,
		},
	},
};

const uiReducer = (state = defaultState.ui, action: any = {}) => {
	switch (action.type) {
		case actions.SET_UI_STATE: {
			return action.value;
		}
		case actions.SET_LENS_STATE: {
			return update(state, {
				lensState: (lensState) =>
					update(lensState || {}, {
						[action.value.lens]: (lens) =>
							update(lens || {}, {
								[action.value.cardId]: (lensCard) =>
									update(lensCard || {}, {
										$merge: action.value.state,
									}),
							}),
					}),
			});
		}
		case actions.SET_TIMELINE_MESSAGE: {
			const { target, message } = action.value;
			return update(state, {
				timelines: {
					[target]: (tgt) =>
						update(tgt || {}, {
							message: {
								$set: message,
							},
						}),
				},
			});
		}
		case actions.SET_TIMELINE_PENDING_MESSAGES: {
			const { target, messages } = action.value;
			return update(state, {
				timelines: {
					[target]: (tgt) =>
						update(tgt || {}, {
							pending: {
								$set: messages,
							},
						}),
				},
			});
		}

		default:
			return state;
	}
};

const coreReducer = (state = defaultState.core, action: any = {}) => {
	switch (action.type) {
		case actions.SET_MENTIONS_COUNT: {
			return {
				...state,
				mentionsCount: action.value,
			};
		}
		case actions.UPDATE_CHANNEL: {
			const existingChannelIndex = _.findIndex(state.channels, {
				id: action.value.id,
			});

			// Note: The state will not be changed if the channel is not already
			// in the state
			if (existingChannelIndex !== -1) {
				return update(state, {
					channels: {
						[existingChannelIndex]: {
							$set: action.value,
						},
					},
				});
			}
			return state;
		}
		case actions.ADD_CHANNEL: {
			let newChannels = clone(state.channels);

			if (action.value.data.parentChannel) {
				// If the triggering channel is not the last channel, remove trailing
				// channels. This creates a 'breadcrumb' effect when navigating channels
				const triggerIndex = _.findIndex(state.channels, {
					id: action.value.data.parentChannel,
				});
				if (triggerIndex > -1) {
					const shouldTrim = triggerIndex + 1 < state.channels.length;
					if (shouldTrim) {
						newChannels = _.take(newChannels, triggerIndex + 1);
					}
				}
			}
			newChannels.push(action.value);
			return update(state, {
				channels: {
					$set: newChannels,
				},
			});
		}
		case actions.REMOVE_CHANNEL: {
			const index = _.findIndex(state.channels, {
				id: action.value.id,
			});
			if (index !== -1) {
				return update(state, {
					channels: {
						$splice: [[index, 1]],
					},
				});
			}
			return state;
		}
		case actions.SET_CHANNELS: {
			return update(state, {
				channels: {
					$set: action.value,
				},
			});
		}
		case actions.SET_CARD: {
			const card = action.value;
			const cardType = card.type.split('@')[0];
			const prevCard = _.cloneDeep(
				_.get(state, ['cards', cardType, card.id], {}),
			);
			const mergedCard = _.merge(prevCard, card);
			return update(state, {
				cards: {
					[cardType]: (cardsForType) =>
						update(cardsForType || {}, {
							[card.id]: (existingCard) =>
								update(existingCard || {}, {
									$set: mergedCard,
								}),
						}),
				},
			});
		}
		case actions.SET_ACCOUNT: {
			return {
				...state,
				accounts: {
					...state.accounts,
					[action.value.user]: action.value.token,
				},
			};
		}
		case actions.SET_DEFAULT_ACCOUNT: {
			return {
				...state,
				defaultAccount: action.value,
			};
		}
		case actions.SET_SELECTED_ACCOUNT: {
			return {
				...state,
				selectedAccount: action.value,
			};
		}
		case actions.REMOVE_ACCOUNT: {
			const { [action.value]: removedAccount, ...updatedAccountsMap } =
				state.accounts;

			return {
				...state,
				accounts: updatedAccountsMap,
			};
		}
		case actions.SET_CURRENT_USER: {
			return {
				...state,
				currentUser: action.value,
			};
		}
		case actions.SET_TYPES: {
			return update(state, {
				types: {
					$set: action.value,
				},
			});
		}
		case actions.SET_LOOPS: {
			return update(state, {
				loops: {
					$set: action.value,
				},
			});
		}
		case actions.SET_GROUPS: {
			const { groups, userSlug } = action.value;
			const newGroups = _.reduce(
				groups,
				(acc, group) => {
					const groupUsers = _.map(group.links['has group member'], 'slug');
					const groupSummary = {
						name: group.name,
						users: groupUsers,
						isMine: groupUsers.includes(userSlug),
					};
					acc[group.name] = groupSummary;
					return acc;
				},
				{},
			);
			return update(state, {
				groups: {
					$set: newGroups,
				},
			});
		}
		case actions.SET_ORGS: {
			return update(state, {
				orgs: {
					$set: action.value,
				},
			});
		}
		case actions.SET_STATUS: {
			return update(state, {
				status: {
					$set: action.value,
				},
			});
		}
		case actions.SET_CONFIG: {
			return update(state, {
				config: {
					$set: action.value,
				},
			});
		}
		case actions.USER_STARTED_TYPING: {
			return update(state, {
				usersTyping: (usersTyping) =>
					update(usersTyping || {}, {
						[action.value.card]: (card) =>
							update(card || {}, {
								[action.value.user]: {
									$set: true,
								},
							}),
					}),
			});
		}
		case actions.USER_STOPPED_TYPING: {
			return update(state, {
				usersTyping: (usersTyping) =>
					update(usersTyping || {}, {
						[action.value.card]: (card) =>
							update(card || {}, {
								$unset: [action.value.user],
							}),
					}),
			});
		}
		case actions.SET_USER_CUSTOM_FILTERS: {
			return update(state, {
				userCustomFilters: (value) =>
					update(value, {
						[action.value.id]: {
							$set: action.value.data,
						},
					}),
			});
		}

		default:
			return state;
	}
};

const corePersistConfig = {
	storage,
	key: 'core',
	whitelist: ['accounts', 'defaultAccount'],
};

const uiPersistConfig = {
	storage,
	key: 'ui',
	whitelist: ['timelines'],
};

export const reducer = redux.combineReducers({
	router: connectRouter(history),
	core: persistReducer(corePersistConfig, coreReducer),
	ui: persistReducer(uiPersistConfig, uiReducer),
});
