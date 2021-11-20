import { getWrapper, flushPromises } from '../../../test/ui-setup';
import _ from 'lodash';
import React from 'react';
import { mount } from 'enzyme';
import sinon from 'sinon';
import { SaveCardButton } from './SaveCardButton';

const card = {
	id: 2,
	slug: 'c-2',
	type: 'card@1.0.0',
};

const updatedCard = _.merge({}, card, {
	name: 'new',
});

const wrappingComponent = getWrapper().wrapper;

const sandbox = sinon.createSandbox();

let context: any = {};

describe('SaveCardButton', () => {
	beforeEach(() => {
		context = {
			commonProps: {
				card,
				onDone: sandbox.fake(),
				patch: sandbox.stub().resolves([]),
				onUpdateCard: sandbox.stub().resolves(updatedCard),
				sdk: {
					card: {
						get: sandbox.stub().resolves(updatedCard),
					},
				},
			},
		};
	});

	afterEach(() => {
		sandbox.restore();
	});

	test('Card is updated when the button is clicked', async () => {
		const { commonProps } = context;

		const component = await mount(<SaveCardButton {...commonProps} />, {
			wrappingComponent,
		});

		const btn = component.find('button');
		btn.simulate('click');
		await flushPromises();
		expect(commonProps.patch.calledOnce).toBe(true);
		expect(commonProps.patch.getCall(0).firstArg).toEqual(card);
		expect(commonProps.onUpdateCard.calledOnce).toBe(true);
		expect(commonProps.onUpdateCard.getCall(0).firstArg).toEqual(card);
		expect(commonProps.onDone.calledOnce).toBe(true);
		expect(commonProps.onDone.getCall(0).firstArg).toEqual(updatedCard);
	});
});
