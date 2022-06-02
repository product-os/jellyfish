import { getWrapper } from '../../../../test/ui-setup';
import sinon from 'sinon';
import React from 'react';
import { mount } from 'enzyme';
import { ViewFooter } from './ViewFooter';

const wrappingComponent = getWrapper().wrapper;

const type1 = {
	slug: 'user',
	name: 'User',
};

const type2 = {
	slug: 'org',
	name: 'Organization',
};

const types = [type1, type2];

const sandbox = sinon.createSandbox();

let context: any = {};

describe('ViewFooter', () => {
	beforeEach(() => {
		context = {
			defaultProps: {
				actions: {
					addCard: sandbox.stub(),
					openCreateChannel: sandbox.stub(),
				},
				errorReporter: { handleAsyncError: sandbox.stub() },
				channel: {},
				channelData: {
					head: {},
					channel: {},
				},
			},
		};
	});

	afterEach(() => {
		sandbox.restore();
	});

	test('renders a single button if only one type is supplied', () => {
		const { defaultProps } = context;
		const component = mount(<ViewFooter types={[type1]} {...defaultProps} />, {
			wrappingComponent,
		});

		const singleButton = component
			.find('button[data-test="viewfooter__add-btn--user"]')
			.first();
		expect(singleButton.text()).toBe('Add User');
	});

	test('renders a drop-down button if multiple types are supplied', () => {
		const { defaultProps } = context;
		const component = mount(<ViewFooter types={types} {...defaultProps} />, {
			wrappingComponent,
		});

		const dropDownButton = component
			.find('button[data-test="viewfooter__add-dropdown"]')
			.first();
		expect(dropDownButton.text()).toBe('Add User');
	});
});
