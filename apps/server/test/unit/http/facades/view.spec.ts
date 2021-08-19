/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash';
import { ViewFacade } from '../../../../lib/http/facades/view';

test('viewFacade should discard view slugs without version', async () => {
	const viewFacade = new ViewFacade();

	expect(
		viewFacade.queryByView(null, null, 'slug', null, null, null),
	).rejects.toBeTruthy();
});

test('viewFacade should return null if view is not found', async () => {
	const viewFacade = new ViewFacade({
		getCardBySlug: _.constant(Promise.resolve(null)),
	});

	const result = await viewFacade.queryByView(
		null,
		null,
		'slug@1.0.0',
		null,
		null,
		null,
	);

	expect(result).toBeFalsy();
});

test('viewFacade should reject params not matching params schema', async () => {
	const viewFacade = new ViewFacade({
		getCardBySlug: _.constant(
			Promise.resolve({
				data: {
					arguments: {
						type: 'object',
						required: ['types'],
						properties: {
							types: {
								type: 'array',
								items: {
									type: 'string',
								},
							},
						},
					},
				},
			}),
		),
	});

	expect(
		viewFacade.queryByView(
			null,
			null,
			'slug@1.0.0',
			'wrong param type',
			null,
			null,
		),
	).rejects.toHaveProperty('message');
});

test('viewFacade should query using a plain (non template) view', async () => {
	expect.assertions(1);

	const viewFacade = new ViewFacade(
		{
			getCardBySlug: _.constant(
				Promise.resolve({
					example: 'view',
				}),
			),
		},
		{
			async queryAPI(_context, _sessionToken, query, _options, _ipAddress) {
				expect(query).toEqual({
					example: 'view',
				});
			},
		},
	);

	await viewFacade.queryByView(null, null, 'slug@1.0.0', null, null, null);
});

test('viewFacade should query using a rendered template view', async () => {
	expect.assertions(1);

	const viewFacade = new ViewFacade(
		{
			getCardBySlug: _.constant(
				Promise.resolve({
					data: {
						allOf: [
							{
								name: 'Card type view',
								schema: {
									type: 'object',
									properties: {
										type: {
											type: 'string',
											enum: {
												$eval: 'types',
											},
										},
										active: {
											type: 'boolean',
											const: true,
										},
									},
									additionalProperties: true,
									required: ['type'],
								},
							},
						],
						arguments: {
							type: 'object',
							required: ['types'],
							properties: {
								types: {
									type: 'array',
									items: {
										type: 'string',
									},
								},
							},
						},
					},
				}),
			),
		},
		{
			async queryAPI(_context, _sessionToken, query, _options, _ipAddress) {
				expect(query).toEqual({
					data: {
						allOf: [
							{
								name: 'Card type view',
								schema: {
									type: 'object',
									properties: {
										type: {
											type: 'string',
											enum: ['view', 'view@1.0.0'],
										},
										active: {
											type: 'boolean',
											const: true,
										},
									},
									additionalProperties: true,
									required: ['type'],
								},
							},
						],
						arguments: {
							type: 'object',
							required: ['types'],
							properties: {
								types: {
									type: 'array',
									items: {
										type: 'string',
									},
								},
							},
						},
					},
				});
			},
		},
	);

	await viewFacade.queryByView(
		null,
		null,
		'slug@1.0.0',
		{
			types: ['view', 'view@1.0.0'],
		},
		null,
		null,
	);
});
