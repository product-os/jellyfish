import { getPromiseResolver, getWrapper } from '../../../../test/ui-setup';
import { mount } from 'enzyme';
import sinon from 'sinon';
import React from 'react';
import { LinkModal } from '../LinkModal';
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

const submit = (linkModalComponent) => {
	const button = linkModalComponent.find(
		'button[data-test="card-linker--existing__submit"]',
	);
	button.simulate('click');
};

// TBD: This code assumes that Promise.all in LinkModal will call the async createLink methods
// in the same order as the cards are provided in the cards prop.
const verifyCard = (commonProps, callIndex, expectedCard) => {
	const [theCard, theSelectedTarget, linkTypeName] =
		commonProps.actions.createLink.args[callIndex];
	expect(theCard).toEqual(expectedCard);
	expect(theSelectedTarget).toEqual(selectedTarget);
	expect(linkTypeName).toBe('is member of');

	const [savedSelectedTarget, savedLinkTypeName] =
		commonProps.onSaved.args[callIndex];
	expect(savedSelectedTarget).toEqual(selectedTarget);
	expect(savedLinkTypeName).toBe('is member of');
};

let context: any = {};

describe('LinkModal', () => {
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
				onSaved: sandbox.stub(),
				allTypes: types,
				actions: {
					createLink: sandbox.stub().resolves(null),
				},
			},
		};
	});

	afterEach(async () => {
		sandbox.restore();
	});

	test('can link one card to another card', async () => {
		const { commonProps, onHidePromise, autoCompleteCallbacks } = context;

		const linkModalComponent = await mount(
			<LinkModal {...commonProps} cards={[card]} targetTypes={types} />,
			{
				wrappingComponent: Wrapper,
			},
		);

		autoCompleteCallbacks.onChange(selectedTarget);

		submit(linkModalComponent);

		await onHidePromise.promise;

		verifyCard(commonProps, 0, card);
	});

	test('can link multiple cards to another card', async () => {
		const { commonProps, onHidePromise, autoCompleteCallbacks } = context;

		const linkModalComponent = await mount(
			<LinkModal {...commonProps} cards={[card, card2]} targetTypes={types} />,
			{
				wrappingComponent: Wrapper,
			},
		);

		autoCompleteCallbacks.onChange(selectedTarget);

		submit(linkModalComponent);

		await onHidePromise.promise;

		expect(commonProps.actions.createLink.callCount).toBe(2);
		expect(commonProps.onSaved.callCount).toBe(2);

		verifyCard(commonProps, 0, card);
		verifyCard(commonProps, 1, card2);
	});

	test('throws exception if card types are different', async () => {
		const { commonProps } = context;

		expect(() => {
			mount(
				<LinkModal
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

	test('disables the select element if target is specified', async () => {
		const { commonProps, onHidePromise } = context;

		const linkModalComponent = await mount(
			<LinkModal
				{...commonProps}
				cards={[card]}
				targetTypes={types}
				target={selectedTarget}
			/>,
			{
				wrappingComponent: Wrapper,
			},
		);

		const autoComplete = linkModalComponent
			.find('AutoCompleteCardSelect')
			.first();
		expect(autoComplete.prop('isDisabled')).toBe(true);

		submit(linkModalComponent);

		await onHidePromise.promise;

		verifyCard(commonProps, 0, card);
	});
});

/**
 * Scenarios:
 *
 * 1. Source and target are specified (disabled select), only one link
 *    verb option (type filter not displayed)
 * 2. Multiple target types (verify type buttons), simulate select
 *    verify link type select, simulate link type select
 * 3. Multiple target types - select type filter, simulate select
 *    only one link verb option
 *
 */
