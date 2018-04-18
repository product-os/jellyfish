import * as Promise from 'bluebird';
import * as _ from 'lodash';
import { Type } from '../../../Types';
import store from '../store';
import { query } from './db';

export const getAll = (): Promise<Type[]> => query<Type>({
	type: 'object',
	properties: {
		type: {
			const: 'type',
		},
	},
	additionalProperties: true,
});

export const get = (type: string) =>
	_.find(store.getState().types, { slug: type });

