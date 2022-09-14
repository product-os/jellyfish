import {
	Contract,
	JsonSchema,
	LoopContract,
	OrgContract,
	RelationshipContract,
	TypeContract,
	UserContract,
} from 'autumndb';
import { ChannelContract } from '../types';
import type { State } from './reducer';

const ACTION_TYPES = {
	ADD_CHANNEL: 'ADD_CHANNEL',
	LOGOUT: 'LOGOUT',
	REMOVE_CHANNEL: 'REMOVE_CHANNEL',
	SET_AUTHTOKEN: 'SET_AUTHTOKEN',
	SET_CARD: 'SET_CARD',
	SET_CHANNELS: 'SET_CHANNELS',
	SET_CONFIG: 'SET_CONFIG',
	SET_GROUPS: 'SET_GROUPS',
	SET_IMAGE: 'SET_IMAGE',
	SET_LENS_STATE: 'SET_LENS_STATE',
	SET_LOOPS: 'SET_LOOPS',
	SET_MENTIONS_COUNT: 'SET_MENTIONS_COUNT',
	SET_ORGS: 'SET_ORGS',
	SET_RELATIONSHIPS: 'SET_RELATIONSHIPS',
	SET_SEND_COMMAND: 'SET_SEND_COMMAND',
	SET_STATUS: 'SET_STATUS',
	SET_TIMELINE_MESSAGE: 'SET_TIMELINE_MESSAGE',
	SET_TIMELINE_PENDING_MESSAGES: 'SET_TIMELINE_PENDING_MESSAGES',
	SET_TYPES: 'SET_TYPES',
	SET_UI_STATE: 'SET_UI_STATE',
	SET_USER: 'SET_USER',
	SET_USER_CUSTOM_FILTERS: 'SET_USER_CUSTOM_FILTERS',
	UPDATE_CHANNEL: 'UPDATE_CHANNEL',
	USER_STARTED_TYPING: 'USER_STARTED_TYPING',
	USER_STOPPED_TYPING: 'USER_STOPPED_TYPING',
};

export default ACTION_TYPES;

export type ACTION_TYPES = keyof typeof ACTION_TYPES;

interface ActionBase {
	type: ACTION_TYPES;
	value?: any;
}

interface ActionAddChannel extends ActionBase {
	type: 'ADD_CHANNEL';
	value: ChannelContract;
}

interface ActionLogout extends ActionBase {
	type: 'LOGOUT';
}

interface ActionRemoveChannel extends ActionBase {
	type: 'REMOVE_CHANNEL';
	value: ChannelContract;
}

interface ActionSetAuthToken extends ActionBase {
	type: 'SET_AUTHTOKEN';
	value: string;
}

interface ActionSetCard extends ActionBase {
	type: 'SET_CARD';
	value: Contract;
}

interface ActionSetChannels extends ActionBase {
	type: 'SET_CHANNELS';
	value: ChannelContract[];
}

interface ActionSetConfig extends ActionBase {
	type: 'SET_CONFIG';
	value: {
		version?: string;
		codename?: string;
	};
}

interface ActionSetGroups extends ActionBase {
	type: 'SET_GROUPS';
	value: {
		groups: Contract[];
		userSlug: string;
	};
}

interface ActionSetImage extends ActionBase {
	type: 'SET_IMAGE';
	value: {
		contractId: string;
		name: string;
		src: string;
	};
}

interface ActionSetLensState extends ActionBase {
	type: 'SET_LENS_STATE';
	value: {
		lens: string;
		cardId: string;
		state: {
			activeIndex: number;
		};
	};
}

interface ActionSetLoops extends ActionBase {
	type: 'SET_LOOPS';
	value: LoopContract[];
}

interface ActionSetMentions extends ActionBase {
	type: 'SET_MENTIONS_COUNT';
	value: number;
}

interface ActionSetOrgs extends ActionBase {
	type: 'SET_ORGS';
	value: OrgContract[];
}

interface ActionSetRelationships extends ActionBase {
	type: 'SET_RELATIONSHIPS';
	value: RelationshipContract[];
}

interface ActionSetSendCommand extends ActionBase {
	type: 'SET_SEND_COMMAND';
	value: string;
}

interface ActionSetStatus extends ActionBase {
	type: 'SET_STATUS';
	value: 'initializing' | 'unauthorized' | 'authorized';
}

interface ActionSetTimelineMessage extends ActionBase {
	type: 'SET_TIMELINE_MESSAGE';
	value: {
		target: string;
		message: Contract;
	};
}

interface ActionSetTimelinePendingMessages extends ActionBase {
	type: 'SET_TIMELINE_PENDING_MESSAGES';
	value: {
		target: string;
		messages: Contract[];
	};
}

interface ActionSetTypes extends ActionBase {
	type: 'SET_TYPES';
	value: TypeContract[];
}

interface ActionSetUiState extends ActionBase {
	type: 'SET_UI_STATE';
	value: State['ui'];
}

interface ActionSetUser extends ActionBase {
	type: 'SET_USER';
	value: UserContract;
}

interface ActionSetUserCustomFilters extends ActionBase {
	type: 'SET_USER_CUSTOM_FILTERS';
	value: {
		id: string;
		data: JsonSchema[];
	};
}

interface ActionUpdateChannel extends ActionBase {
	type: 'UPDATE_CHANNEL';
	value: ChannelContract;
}

interface ActionUserStartedTyping extends ActionBase {
	type: 'USER_STARTED_TYPING';
	value: {
		user: string;
		card: string;
	};
}

interface ActionUserStoppedTyping extends ActionBase {
	type: 'USER_STOPPED_TYPING';
	value: {
		user: string;
		card: string;
	};
}

export type Action =
	| ActionAddChannel
	| ActionLogout
	| ActionRemoveChannel
	| ActionSetAuthToken
	| ActionSetCard
	| ActionSetChannels
	| ActionSetConfig
	| ActionSetGroups
	| ActionSetImage
	| ActionSetLensState
	| ActionSetLoops
	| ActionSetMentions
	| ActionSetOrgs
	| ActionSetRelationships
	| ActionSetSendCommand
	| ActionSetStatus
	| ActionSetTimelineMessage
	| ActionSetTimelinePendingMessages
	| ActionSetTypes
	| ActionSetUiState
	| ActionSetUser
	| ActionSetUserCustomFilters
	| ActionUpdateChannel
	| ActionUserStartedTyping
	| ActionUserStoppedTyping;
