import { getPromiseResolver, getWrapper } from '../../../../test/ui-setup';
import { mount } from 'enzyme';
import sinon from 'sinon';
import React from 'react';
import { UnlinkModal } from '../UnlinkModal';
import * as AutoCompleteCardSelect from '../../AutoCompleteCardSelect';
import user from './fixtures/user.json';
import org from './fixtures/org.json';

const sandbox = sinon.createSandbox();

const { wrapper: Wrapper } = getWrapper();

const card = {
	id: 'U1',
	slug: 'user-1',
	type: 'user@1.0.0',
};

const card2 = {
	id: 'U2',
	slug: 'user-2',
	type: 'user@1.0.0',
};

const orgInstanceCard = {
	id: 'O2',
	slug: 'org-1',
	type: 'org@1.0.0',
};

const types = [user, org];

const targets = [
	{
		id: 'R1',
		slug: 'org-balena',
		name: 'Balena',
		type: 'org@1.0.0',
	},
	{
		id: 'R2',
		slug: 'org-google',
		name: 'Google',
		type: 'org@1.0.0',
	},
];

const selectedTarget = targets[0];

// Mock the AutoCompleteCardSelect as it doesn't work well outside of the real browser environment
const mockAutoCompleteCardSelect = () => {
	const callbacks: any = {};
	const FakeAutoCompleteCardSelect = ({ onChange }) => {
		callbacks.onChange = onChange;
		return null;
	};
	const autoCompleteCardSelectComponentStub = sandbox.stub(
		AutoCompleteCardSelect,
		'AutoCompleteCardSelect',
	);
	autoCompleteCardSelectComponentStub.callsFake((props) =>
		FakeAutoCompleteCardSelect(props),
	);
	return callbacks;
};

const submit = (unlinkModalComponent) => {
	const button = unlinkModalComponent.find(
		'button[data-test="card-unlinker__submit"]',
	);
	button.simulate('click');
};

// TBD: This code assumes that Promise.all in UnlinkModal will call the async removeLink methods
// in the same order as the cards are provided in the cards prop.
const verifyCard = (commonProps, callIndex, expectedCard) => {
	const [theCard, theSelectedTarget, linkTypeName] =
		commonProps.actions.removeLink.args[callIndex];
	expect(theCard).toEqual(expectedCard);
	expect(theSelectedTarget).toEqual(selectedTarget);
	expect(linkTypeName).toBe('is member of');
};

let context: any = {};

describe('UnlinkModal', () => {
	beforeEach(async () => {
		const onHidePromise = getPromiseResolver();
		const onHide = () => {
			onHidePromise.resolver();
		};
		context = {
			onHidePromise,
			autoCompleteCallbacks: mockAutoCompleteCardSelect(),
			commonProps: {
				onHide,
				allTypes: types,
				actions: {
					removeLink: sandbox.stub().resolves(null),
				},
			},
		};
	});

	afterEach(async () => {
		sandbox.restore();
	});

	test('can unlink one card from another card', async () => {
		const { commonProps, onHidePromise, autoCompleteCallbacks } = context;

		const unlinkModalComponent = await mount(
			<UnlinkModal {...commonProps} cards={[card]} targetTypes={types} />,
			{
				wrappingComponent: Wrapper,
			},
		);

		autoCompleteCallbacks.onChange(selectedTarget);

		submit(unlinkModalComponent);

		await onHidePromise.promise;

		expect(commonProps.actions.removeLink.callCount).toBe(1);

		verifyCard(commonProps, 0, card);
	});

	test('can unlink multiple cards from another card', async () => {
		const { commonProps, onHidePromise, autoCompleteCallbacks } = context;

		const unlinkModalComponent = await mount(
			<UnlinkModal
				{...commonProps}
				cards={[card, card2]}
				targetTypes={types}
			/>,
			{
				wrappingComponent: Wrapper,
			},
		);

		autoCompleteCallbacks.onChange(selectedTarget);

		submit(unlinkModalComponent);

		await onHidePromise.promise;

		expect(commonProps.actions.removeLink.callCount).toBe(2);

		verifyCard(commonProps, 0, card);
		verifyCard(commonProps, 1, card2);
	});

	test('throws exception if card types are different', async () => {
		const { commonProps } = context;

		expect(() => {
			mount(
				<UnlinkModal
					{...commonProps}
					cards={[card, orgInstanceCard]}
					targetTypes={types}
				/>,
				{
					wrappingComponent: Wrapper,
				},
			);
		}).toThrow('All cards must be of the same type');
	});
});
