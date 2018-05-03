import * as Promise from 'bluebird';
import * as _ from 'lodash';
import { Type } from '../Types';
import { Sdk } from './index';

export class TypeSdk {
	private types: Type[];
	constructor(private sdk: Sdk) {}

	public getAll(): Promise<Type[]> {
		return this.sdk.query<Type>({
			type: 'object',
			properties: {
				type: {
					const: 'type',
				},
			},
			additionalProperties: true,
		})
		.tap((types) => {
			this.types = types;
		});
	}

	public get(type: string) {
		return _.find(this.types, { slug: type });
	}
}
