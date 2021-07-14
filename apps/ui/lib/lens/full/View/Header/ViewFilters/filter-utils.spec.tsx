/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import type { JSONSchema } from '@balena/jellyfish-types';
import {
	getLinkedContractDataFilterKey,
	unpackLinksSchema,
} from './filter-utils';

describe('getLinkedContractDataFilterKey', () => {
	it('handles a single type', () => {
		const key = getLinkedContractDataFilterKey(
			'is attached to',
			'pattern@1.0.0',
			'___name',
		);
		expect(key).toBe('___$$links___is attached to___pattern@1.0.0___name');
	});

	it('handles multiple types', () => {
		const key = getLinkedContractDataFilterKey(
			'is attached to',
			['pattern@1.0.0', 'improvement@1.0.0'],
			'___name',
		);
		expect(key).toBe(
			'___$$links___is attached to___pattern@1.0.0,improvement@1.0.0___name',
		);
	});

	it("throws if a type isn't versioned", () => {
		expect(() => {
			getLinkedContractDataFilterKey(
				'is attached to',
				['pattern@1.0.0', 'improvement'],
				'___name',
			);
		}).toThrow('getLinkedContractDataFilterKey: types must be versioned');
	});

	it("throws if the keyPath doesn't start with the delimiter", () => {
		expect(() => {
			getLinkedContractDataFilterKey('is attached to', 'pattern@1.0.0', 'name');
		}).toThrow("getLinkedContractDataFilterKey: keyPath must start with '___'");
	});
});

describe('unpackLinksSchema', () => {
	it('handles a single type', () => {
		const pseudoLinksSchema: JSONSchema = {
			type: 'object',
			required: ['is attached to'],
			properties: {
				'is attached to': {
					type: 'object',
					required: ['pattern@1.0.0'],
					properties: {
						'pattern@1.0.0': {
							required: ['name'],
							properties: {
								name: {
									type: 'string',
									const: 'testing',
								},
							},
						},
					},
				},
			},
		};
		const linksSchema = unpackLinksSchema(pseudoLinksSchema);
		expect(linksSchema).toEqual({
			'is attached to': {
				type: 'object',
				additionalProperties: true,
				required: ['name', 'type'],
				properties: {
					type: {
						type: 'string',
						const: 'pattern@1.0.0',
					},
					name: {
						type: 'string',
						const: 'testing',
					},
				},
			},
		});
	});

	it('handles multiple types', () => {
		const pseudoLinksSchema: JSONSchema = {
			type: 'object',
			required: ['is attached to'],
			properties: {
				'is attached to': {
					type: 'object',
					required: ['pattern@1.0.0,improvement@1.0.0'],
					properties: {
						'pattern@1.0.0,improvement@1.0.0': {
							required: ['name'],
							properties: {
								name: {
									type: 'string',
									const: 'testing',
								},
							},
						},
					},
				},
			},
		};
		const linksSchema = unpackLinksSchema(pseudoLinksSchema);
		expect(linksSchema).toEqual({
			'is attached to': {
				type: 'object',
				additionalProperties: true,
				required: ['name', 'type'],
				properties: {
					type: {
						type: 'string',
						enum: ['pattern@1.0.0', 'improvement@1.0.0'],
					},
					name: {
						type: 'string',
						const: 'testing',
					},
				},
			},
		});
	});
});
