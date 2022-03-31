import type { JsonSchema } from '@balena/jellyfish-types';
import type {
	Contract,
	TypeContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';
import React from 'react';

export type Channel = Contract<{
	target: string;
}>;

export interface JSONPatch {
	op: 'add' | 'remove' | 'replace';
	path: string[] | string;
	value: any;
}

// Utility type that allows you to change the return type of a function
// From https://stackoverflow.com/a/50014868
export type ReplaceReturnType<T extends (...a: any) => any, TNewReturn> = (
	...a: Parameters<T>
) => TNewReturn;

// Utility type for typing bound action creator functions
// It maps the call signature to the returh type of the redux thunk.
// Without this, the return type would be the thunk itself.
// Example:
// interface ComponentProps {
// 	actions: BoundActionCreators<Pick<typeof actionCreators, 'update' | 'create'>>;
// }
export type BoundActionCreators<
	TActionCreators extends { [fn: string]: (...a: any) => any },
> = {
	[Property in keyof TActionCreators]: ReplaceReturnType<
		TActionCreators[Property],
		ReturnType<ReturnType<TActionCreators[Property]>>
	>;
};

export interface LensContract
	extends Pick<Contract, 'slug' | 'type' | 'version' | 'name' | 'data'> {
	data: {
		label?: string;
		pathRegExp?: string;
		type?: 'view' | '*';
		supportsSlices?: boolean;
		icon: string;
		format: 'list' | 'full' | 'summary' | 'snippet';
		renderer: React.ComponentType<LensRendererProps>;
		filter: JsonSchema;
		queryOptions?: {
			limit?: number;
			sortBy?: string;
			sortDir?: 'asc' | 'desc';
			mask: (query: JsonSchema) => JsonSchema;
		};
	};
}

export interface ChannelContract
	extends Pick<Contract, 'slug' | 'type' | 'active' | 'data' | 'created_at'> {
	data: {
		canonical?: boolean;
		target: 'string';
		error?: any;
		cardType?: string;
		seed?: any;
		head?: {
			onDone: any;
			seed: any;
			types: TypeContract[];
		};
	};
}

export interface LensRendererProps {
	channel: ChannelContract;
	card: Contract;
	user: UserContract;
	tail: null | Contract[];
	hasNextPage: boolean;
	nextPage: () => Promise<Contract[]>;
	pageOptions: {
		page: number;
		totalPages: number;
	};
	page: number;
	totalPages: number;
	tailTypes: TypeContract[];
}

export interface ChatGroup {
	isMine: boolean;
	name: string;
	users: string[];
}

export interface UIActor {
	name: string;
	email: string | string[];
	avatarUrl?: string | null;
	proxy: boolean;
	card: UserContract;
}
