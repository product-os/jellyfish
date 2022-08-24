import { Contract, UserContract } from 'autumndb';

interface ActionBase {
	type: 'SET_CARDS' | 'DELETE_CARD' | 'SET_CURRENT_USER' | 'SET_GROUPS';
}

interface ActionSetCards extends ActionBase {
	type: 'SET_CARDS';
	payload: Contract[];
}

interface ActionDeleteCard extends ActionBase {
	type: 'DELETE_CARD';
	payload: string;
}

interface ActionSetCurrentUser extends ActionBase {
	type: 'SET_CURRENT_USER';
	payload: UserContract;
}

interface ActionSetGroups extends ActionBase {
	type: 'SET_GROUPS';
	payload: Contract[];
}

export type Action =
	| ActionSetCards
	| ActionDeleteCard
	| ActionSetCurrentUser
	| ActionSetGroups;
