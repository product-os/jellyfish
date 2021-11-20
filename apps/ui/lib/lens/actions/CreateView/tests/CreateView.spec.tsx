import { getWrapper } from '../../../../../test/ui-setup';
import _ from 'lodash';
import { mount } from 'enzyme';
import sinon from 'sinon';
import React from 'react';
import Bluebird from 'bluebird';
import CreateView from '../CreateView';
import userType from './fixtures/user.json';

const sandbox = sinon.createSandbox();

const wrappingComponent = getWrapper({
	core: {},
}).wrapper;

let context: any = {};

describe('CreateView', () => {
	beforeEach(() => {
		context = {
			commonProps: {
				user: {
					slug: 'user-1',
				},
				allTypes: [userType],
				channel: {
					id: 'c-1',
					slug: 'channel-1',
					type: 'channel',
					active: true,
					data: {
						head: {
							onDone: {
								action: 'open',
							},
						},
						format: 'createView',
						canonical: false,
					},
				},
				card: {
					onDone: {
						action: 'open',
					},
				},
				sdk: {},
				actions: {
					createLink: sandbox.stub(),
					removeChannel: sandbox.stub(),
				},
			},
		};
	});

	afterEach(() => {
		sandbox.restore();
	});

	test('The search query searches user slug by regex', async () => {
		const { commonProps } = context;
		commonProps.sdk.query = sandbox.stub().resolves([]);

		const component = await mount(<CreateView {...commonProps} />, {
			wrappingComponent,
		});

		// Wait for debounced query
		await Bluebird.delay(1000);

		// The sdk is queried when the component is mounted
		expect(commonProps.sdk.query.callCount).toBe(1);

		let query = commonProps.sdk.query.getCall(0).firstArg;

		// And the query just searches all users
		expect(query).toEqual({
			type: 'object',
			additionalProperties: true,
			$$links: {
				'is member of': {
					type: 'object',
					properties: {
						slug: {
							const: 'org-balena',
						},
					},
				},
			},
			properties: {
				type: {
					const: 'user@1.0.0',
				},
			},
		});

		// Now enter a search term
		const searchTerm = 'foo';
		const searchInput = component
			.find('input[data-test="private-conversation-search-input"]')
			.first();
		searchInput.simulate('change', {
			target: {
				value: searchTerm,
			},
		});

		// Wait for debounced query
		await Bluebird.delay(1000);

		// The sdk is queried again
		expect(commonProps.sdk.query.callCount).toBe(2);

		// And the query contains a regexp search in the slug field
		query = commonProps.sdk.query.getCall(1).firstArg;
		expect(
			_.find(query.anyOf, {
				properties: {
					slug: {
						regexp: {
							pattern: searchTerm,
						},
					},
				},
			}),
		).toBeTruthy();
	});
});
