import { v4 as isUUID } from 'is-uuid';
import _ from 'lodash';
import type {
	LoopContract,
	TypeContract,
} from '@balena/jellyfish-types/build/core';
import * as helpers from '../services/helpers';
import { getViewId } from './helpers';
import { getUnreadQuery } from '../queries';

export const getCard = (idOrSlug, type) => (state) => {
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

export const getAccounts = () => (state) => {
	return state.core.accounts;
};

export const getOrgs = () => (state) => {
	return state.core.orgs;
};

export const getAppVersion = () => (state) => {
	return _.get(state.core, ['config', 'version']) || null;
};

export const getAppCodename = () => (state) => {
	return _.get(state.core, ['config', 'codename']) || null;
};

export const getChannels = () => (state) => {
	return state.core.channels;
};

export const getCurrentUser = () => (state) => {
	return _.get(state.core, ['session', 'user']) || null;
};

export const getCurrentUserStatus = () => (state) => {
	return _.get(state.core, ['session', 'user', 'data', 'status']) || null;
};

export const getSessionToken = () => (state) => {
	return _.get(state.core, ['session', 'authToken']) || null;
};

export const getStatus = () => (state) => {
	return state.core.status;
};

export const getTimelineMessage = (target) => (state) => {
	return _.get(state.ui, ['timelines', target, 'message'], '');
};

export const getTimelinePendingMessages = (target) => (state) => {
	return _.get(state.ui, ['timelines', target, 'pending'], '');
};

export const getChatWidgetOpen = () => (state) => {
	return _.get(state.ui, ['chatWidget', 'open']);
};

export const getTypes =
	() =>
	(state): TypeContract[] => {
		return state.core.types;
	};

export const getLoops =
	() =>
	(state): LoopContract[] => {
		return state.core.loops;
	};

export const getGroups = () => (state) => {
	return state.core.groups;
};

export const getMyGroupNames = () => (state) => {
	return _.map(_.filter(getGroups()(state), 'isMine'), 'name');
};

export const getUIState = (state) => {
	return state.ui;
};

export const getSidebarIsExpanded = (name) => (state) => {
	const expandedItems = _.get(state.ui, ['sidebar', 'expanded'], []);
	return _.includes(expandedItems, name);
};

export const getLensState = (lensSlug, cardId) => (state) => {
	return _.get(state.ui, ['lensState', lensSlug, cardId], {});
};

export const getUsersTypingOnCard = (card) => (state) => {
	return _.keys(_.get(state.core, ['usersTyping', card], {}));
};

export const getSubscription = (id) => (state) => {
	return state.views.subscriptions[id] || null;
};

export const getSubscriptions = () => (state) => {
	return state.views.subscriptions || {};
};

export const getUsersViewLens = (viewId) => (state) => {
	const user = getCurrentUser()(state);
	return _.get(user, ['data', 'profile', 'viewSettings', viewId, 'lens'], null);
};

export const getUserCustomFilters = (contractId) => (state) => {
	return state.core.userCustomFilters[contractId] || [];
};

export const getHomeView = () => (state) => {
	const user = getCurrentUser()(state);
	return _.get(user, ['data', 'profile', 'homeView'], null);
};

export const getActiveLoop =
	() =>
	(state): string | null => {
		const user = getCurrentUser()(state);
		return _.get(user, ['data', 'profile', 'activeLoop'], null);
	};

export const getInboxQuery = () => (state) => {
	const user = getCurrentUser()(state);
	const groupNames = getMyGroupNames()(state);
	return getUnreadQuery(user, groupNames);
};

export const getMentionsCount = () => (state) => {
	return state.core.mentionsCount;
};
