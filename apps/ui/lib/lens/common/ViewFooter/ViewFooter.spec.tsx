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
				},
				channel: {},
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

		singleButton.simulate('click');
		expect(defaultProps.actions.addCard.calledOnce).toBe(true);
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

		dropDownButton.simulate('click');
		expect(defaultProps.actions.addCard.calledOnce).toBe(true);
	});

	test('calls addCard action when a dropdown option is clicked', () => {
		const { defaultProps } = context;
		const component = mount(<ViewFooter types={types} {...defaultProps} />, {
			wrappingComponent,
		});

		const dropDownExpand = component
			.find('button[data-test="viewfooter__add-dropdown"]')
			.at(1);
		dropDownExpand.simulate('click');
		component.update();

		const dropDownOption = component
			.find('[data-test="viewfooter__add-link--org"]')
			.first();
		expect(dropDownOption.text()).toBe('Add Organization');

		dropDownOption.simulate('click');
		expect(defaultProps.actions.addCard.calledOnce).toBe(true);
	});
});
