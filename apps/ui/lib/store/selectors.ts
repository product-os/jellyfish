import { v4 as isUUID } from 'is-uuid';
import _ from 'lodash';
import type {
	LoopContract,
	TypeContract,
} from '@balena/jellyfish-types/build/core';
import * as helpers from '../services/helpers';
import { getUnreadQuery } from '../queries';
import { State } from './reducer';

export const getCard = (idOrSlug, type) => (state: State) => {
	const cards = _.get(state.core, ['cards', helpers.getTypeBase(type)]);
	if (!cards) {
		return null;
	}
	return isUUID(idOrSlug)
		? cards[idOrSlug] || null
		: _.find(cards, {
				slug: idOrSlug,
		  }) || null;
};

export const getAccounts = () => (state: State) => {
	return state.core.accounts;
};

export const getOrgs = () => (state: State) => {
	return state.core.orgs;
};

export const getAppVersion = () => (state: State) => {
	return _.get(state.core, ['config', 'version']) || null;
};

export const getAppCodename = () => (state: State) => {
	return _.get(state.core, ['config', 'codename']) || null;
};

export const getChannels = () => (state: State) => {
	return state.core.channels;
};

export const getSelectedAccount = () => (state: State) => {
	return state.core.selectedAccount;
};

export const getDefaultAccount = () => (state: State) => {
	return state.core.defaultAccount;
};

export const getCurrentUser = () => (state: State) => {
	return state.core.currentUser;
};

export const getCurrentUserStatus = () => (state: State) => {
	return getCurrentUser()(state)?.data.status;
};

export const getSessionToken = (user?: string) => (state: State) => {
	const slug = user || getSelectedAccount()(state);
	return slug ? getAccounts()(state)[slug] : null;
};

export const getStatus = () => (state: State) => {
	return state.core.status;
};

export const getTimelineMessage = (target) => (state: State) => {
	return _.get(state.ui, ['timelines', target, 'message'], '');
};

export const getTimelinePendingMessages = (target) => (state: State) => {
	return _.get(state.ui, ['timelines', target, 'pending'], '');
};

export const getChatWidgetOpen = () => (state: State) => {
	return _.get(state.ui, ['chatWidget', 'open']);
};

export const getTypes =
	() =>
	(state): TypeContract[] => {
		return state.core.types;
	};

export const getLoops =
	() =>
	(state: State): LoopContract[] => {
		return state.core.loops;
	};

export const getGroups = () => (state: State) => {
	return state.core.groups;
};

export const getMyGroupNames = () => (state: State) => {
	return _.map(_.filter(getGroups()(state), 'isMine'), 'name');
};

export const getUIState = (state: State) => {
	return state.ui;
};

export const getSidebarIsExpanded = (name) => (state: State) => {
	const expandedItems = _.get(state.ui, ['sidebar', 'expanded'], []);
	return _.includes(expandedItems, name);
};

export const getLensState = (lensSlug, cardId) => (state: State) => {
	return _.get(state.ui, ['lensState', lensSlug, cardId], {});
};

export const getUsersTypingOnCard = (card) => (state: State) => {
	return _.keys(_.get(state.core, ['usersTyping', card], {}));
};

export const getUsersViewLens = (viewId) => (state: State) => {
	const user = getCurrentUser()(state);
	return _.get(user, ['data', 'profile', 'viewSettings', viewId, 'lens'], null);
};

export const getUserCustomFilters = (contractId) => (state: State) => {
	return state.core.userCustomFilters[contractId] || [];
};

export const getHomeView = () => (state: State) => {
	const user = getCurrentUser()(state);
	return _.get(user, ['data', 'profile', 'homeView'], null);
};

export const getActiveLoop =
	() =>
	(state): string | null => {
		const user = getCurrentUser()(state);
		return _.get(user, ['data', 'profile', 'activeLoop'], null);
	};

export const getInboxQuery = () => (state: State) => {
	const user = getCurrentUser()(state);
	const groupNames = getMyGroupNames()(state);
	return getUnreadQuery(user, groupNames);
};

export const getMentionsCount = () => (state: State) => {
	return state.core.mentionsCount;
};
