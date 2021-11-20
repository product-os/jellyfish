import { getWrapper, flushPromises } from '../../../test/ui-setup';
import '../../../test/react-select-mock';
import { mount } from 'enzyme';
import React from 'react';
import sinon from 'sinon';
import Bluebird from 'bluebird';
import { AutoCompleteCardSelect } from './AutoCompleteCardSelect';

const wrappingComponent = getWrapper().wrapper;

const types = [
	{
		slug: 'user',
		name: 'User',
		version: '1.0.0',
		data: {
			schema: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
						fullTextSearch: true,
					},
				},
			},
		},
	},
	{
		slug: 'issue',
		name: 'Issue',
		version: '1.0.0',
		data: {
			schema: {
				type: 'object',
				properties: {
					title: {
						type: 'string',
						fullTextSearch: true,
					},
				},
			},
		},
	},
];

const users = [
	{
		id: 'u1',
		slug: 'user1',
		name: 'test user',
	},
	{
		id: 'u2',
		slug: 'user2',
		name: 'another user',
	},
];

const issues = [
	{
		id: 'i1',
		slug: 'issue1',
		title: 'test issue',
	},
	{
		id: 'i2',
		slug: 'issue2',
		title: 'another issue',
	},
];

const sandbox = sinon.createSandbox();

let context: any = {};

describe('AutoCompleteCardSelect', () => {
	beforeEach(() => {
		context = {
			sdk: {
				query: sandbox.stub(),
			},
			onChange: sandbox.fake(),
		};
	});

	afterEach(async () => {
		sandbox.restore();
	});

	test('initially, no search term is supplied and the component queries for any cards of the given types', async () => {
		const { sdk, onChange } = context;
		await mount(
			<AutoCompleteCardSelect
				sdk={sdk}
				cardType={['user', 'issue']}
				types={types}
				onChange={onChange}
			/>,
			{
				wrappingComponent,
			},
		);

		// Wait for the debounced search
		await Bluebird.delay(1000);

		expect(sdk.query.callCount).toBe(1);
		const query = sdk.query.getCall(0).firstArg;
		expect(query).toEqual({
			type: 'object',
			required: ['type'],
			properties: {
				type: {
					enum: ['user@1.0.0', 'issue@1.0.0'],
				},
			},
		});
	});

	test('when a search term is supplied, the query searches for fullTextSearch fields in any of the given types', async () => {
		const { sdk, onChange } = context;
		sdk.query.onCall(0).resolves([]);

		const autoComplete = await mount(
			<AutoCompleteCardSelect
				sdk={sdk}
				cardType={['user', 'issue']}
				types={types}
				onChange={onChange}
			/>,
			{
				wrappingComponent,
			},
		);

		// Wait for the debounced search
		await Bluebird.delay(1000);
		await flushPromises();

		expect(sdk.query.callCount).toBe(1);

		const input = autoComplete
			.find('.jellyfish-async-select__input input')
			.first();

		// Input.instance().value = 'test'
		input.props().onChange({
			currentTarget: {
				value: 'test',
			},
		});

		// Wait for the debounced search
		await Bluebird.delay(1000);

		// The SDK query is called a second time
		expect(sdk.query.callCount).toBe(2);
		const query = sdk.query.getCall(1).firstArg;

		// The query now checks for fullTextSearch fields on all supplied card types
		expect(query).toEqual({
			type: 'object',
			anyOf: [
				{
					additionalProperties: true,
					properties: {
						name: {
							fullTextSearch: {
								term: 'test',
							},
							type: 'string',
						},
						type: {
							const: 'user@1.0.0',
						},
					},
					required: ['name', 'type'],
					type: 'object',
				},
				{
					additionalProperties: true,
					properties: {
						slug: {
							const: 'test',
						},
						type: {
							const: 'user@1.0.0',
						},
					},
					required: ['slug', 'type'],
					type: 'object',
				},
				{
					additionalProperties: true,
					properties: {
						title: {
							fullTextSearch: {
								term: 'test',
							},
							type: 'string',
						},
						type: {
							const: 'issue@1.0.0',
						},
					},
					required: ['title', 'type'],
					type: 'object',
				},
				{
					additionalProperties: true,
					properties: {
						slug: {
							const: 'test',
						},
						type: {
							const: 'issue@1.0.0',
						},
					},
					required: ['slug', 'type'],
					type: 'object',
				},
			],
		});
	});
});
