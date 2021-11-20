import { JSONSchema } from '@balena/jellyfish-types';
import { Contract } from '@balena/jellyfish-types/build/core';

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
		label: string;
		pathRegExp?: string;
		type: 'view' | '*';
		supportsSlices?: boolean;
		icon: string;
		format: 'full' | 'summary' | 'snippet';
		renderer: any;
		filter: JSONSchema;
	};
}

export interface ChannelContract
	extends Pick<Contract, 'slug' | 'type' | 'active' | 'data' | 'created_at'> {
	data: {
		canonical?: boolean;
		target: 'string';
		head?: Contract;
		cardType?: string;
	};
}
