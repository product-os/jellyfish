import { JSONSchema } from '@balena/jellyfish-types';
import { core } from '@balena/jellyfish-types';
import React from 'react';

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
	extends Pick<core.Contract, 'slug' | 'type' | 'version' | 'name' | 'data'> {
	data: {
		label?: string;
		pathRegExp?: string;
		type?: 'view' | '*';
		supportsSlices?: boolean;
		icon: string;
		filter: JSONSchema;
		queryOptions?: {
			limit?: number;
			sortBy?: string;
			sortDir?: 'asc' | 'desc';
			mask: (query: JSONSchema) => JSONSchema;
		};
		format: 'list' | 'create' | 'full' | 'summary' | 'snippet';
		renderer: React.ComponentType<LensRendererProps>;
	};
}

export interface ChannelContract
	extends Pick<
		core.Contract,
		'slug' | 'type' | 'active' | 'data' | 'created_at'
	> {
	data: {
		canonical?: boolean;
		target: 'string';
		head?: core.Contract;
		cardType?: string;
	};
}

export interface LensRendererProps {
	card: core.Contract;
	user: core.UserContract;
	channel: ChannelContract;
	tail: null | core.Contract[];
	setPage: (page: number) => Promise<void>;
	// TODO: Why is this data duplicated?
	pageOptions: {
		page: number;
		totalPages: number;
	};
	page: number;
	totalPages: number;
}
