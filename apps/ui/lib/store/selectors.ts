import { v4 as isUUID } from 'is-uuid';
import _ from 'lodash';
import type { Contract, LoopContract, TypeContract } from 'autumndb';
import * as helpers from '../services/helpers';
import { getUnreadQuery } from '../queries';
import type { RelationshipContract } from 'autumndb';
import { State } from './reducer';

export const getCard =
	<T extends Contract = Contract>(idOrSlug: string, type: string) =>
	(state: State): T | null => {
		const cards: { [id: string]: Contract } = _.get(state.core, [
			'cards',
			helpers.getTypeBase(type),
		]);
		if (!cards) {
			return null;
		}
		if (isUUID(idOrSlug)) {
			return (cards[idOrSlug] as T) || null;
		} else {
			return (
				(_.find(cards, {
					slug: idOrSlug,
				}) as T) || null
			);
		}
	};

export const getOrgs = () => (state: State) => {
	return state.core.orgs;
};

export const getAppVersion = () => (state: State) => {
	return state.core?.config?.version ?? null;
};

export const getAppCodename = () => (state: State) => {
	return state.core?.config?.codename ?? null;
};

export const getChannels = () => (state: State) => {
	return state.core.channels;
};

export const getCurrentUser = () => (state: State) => {
	return state.core?.session?.user ?? null;
};

export const getCurrentUserStatus = () => (state: State) => {
	return state.core?.session?.user?.data?.status ?? null;
};

export const getSessionToken = () => (state: State) => {
	return state.core?.session?.authToken ?? null;
};

export const getStatus = () => (state: State) => {
	return state.core.status;
};

export const getTimelineMessage = (target: string) => (state: State) => {
	return state.ui?.timelines?.[target]?.message ?? '';
};

export const getTimelinePendingMessages =
	(target: string) => (state: State) => {
		return state.ui?.timelines?.[target]?.pending ?? '';
	};

export const getChatWidgetOpen =
	() =>
	(state: State): boolean => {
		return state.ui?.chatWidget?.open ?? false;
	};

export const getTypes =
	() =>
	(state: State): TypeContract[] => {
		return state.core.types;
	};

export const getRelationships =
	() =>
	(state: State): RelationshipContract[] => {
		return state.core.relationships || [];
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

export const getSidebarIsExpanded = (name: string) => (state: State) => {
	const expandedItems = state.ui?.sidebar?.expanded ?? [];
	return _.includes(expandedItems, name);
};

export const getLensState =
	(lensSlug: string, cardId: string) => (state: State) => {
		return state.ui?.lensState?.[lensSlug]?.[cardId] ?? {};
	};

export const getUsersTypingOnCard = (card: string) => (state: State) => {
	return _.keys(state.core?.usersTyping?.[card] ?? {});
};

export const getUsersViewLens =
	(viewId: string) =>
	(state: State): string | null => {
		const user = getCurrentUser()(state);
		return (
			(user?.data?.profile?.viewSettings?.[viewId]?.lens as string) ?? null
		);
	};

export const getUserCustomFilters = (contractId: string) => (state: State) => {
	return state.core.userCustomFilters[contractId] || [];
};

export const getHomeView = () => (state: State) => {
	const user = getCurrentUser()(state);
	return user?.data?.profile?.homeView ?? null;
};

export const getActiveLoop =
	() =>
	(state: State): string | null => {
		const user = getCurrentUser()(state);
		return user?.data?.profile?.activeLoop ?? null;
	};

export const getInboxQuery = () => (state: State) => {
	const user = getCurrentUser()(state);
	const groupNames = getMyGroupNames()(state);
	return getUnreadQuery(user, groupNames);
};

export const getMentionsCount = () => (state: State) => {
	return state.core.mentionsCount;
};
