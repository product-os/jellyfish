/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { getPromiseResolver, getWrapper } from '../../../../test/ui-setup';
import { mount } from 'enzyme';
import sinon from 'sinon';
import React from 'react';
import { CreateLens } from '../CreateLens';
import { contact, allTypes } from '../../../../test/fixtures/types';
import { Contract } from '@balena/jellyfish-types/build/core';

const sandbox = sinon.createSandbox();

const contactName = 'Contact A';

const createdCard = {
	id: 'C1',
	slug: 'contact-1',
	name: contactName,
	type: 'contact@1.0.0',
};

const account1 = {
	id: 'A1',
	slug: 'account-1',
	name: 'Account 1',
	type: 'account@1.0.0',
};

const account2 = {
	id: 'A2',
	slug: 'account-2',
	name: 'Account 2',
	type: 'account@1.0.0',
};

const user1 = {
	id: 'U1',
	slug: 'user-1',
	name: 'User 1',
	type: 'user@1.0.0',
};

const seed = {
	active: true,
	markers: ['org-balena'],
	type: 'contact@1.0.0',
};

const createChannel = (card: Partial<Contract>) => {
	return {
		data: {
			head: card,
		},
	};
};

const wrappingComponent = getWrapper({
	core: {
		types: allTypes,
	},
}).wrapper;

const mountCreateLens = async (commonProps, card) => {
	return mount(
		<CreateLens {...commonProps} card={card} channel={createChannel(card)} />,
		{
			wrappingComponent,
		},
	);
};

const enterName = (component) => {
	const nameInput = component.find('input#root_name');
	nameInput.simulate('change', {
		target: {
			value: contactName,
		},
	});
};

const submit = (component) => {
	const submitButton = component.find(
		'button[data-test="card-creator__submit"]',
	);
	submitButton.simulate('click');
};

let context: any = {};

describe('CreateLens', () => {
	beforeEach(async () => {
		const onDonePromise = getPromiseResolver();
		const onLinkPromise = getPromiseResolver();
		context = {
			onDonePromise,
			onLinkPromise,
			commonProps: {
				sdk: {
					card: {
						create: sandbox.stub().resolves(createdCard),
					},
				},
				allTypes,
				actions: {
					removeChannel: sandbox.stub().resolves(null),
					createLink: sandbox.stub().resolves(null),
					getLinks: sandbox.stub().resolves([]),
					queryAPI: sandbox.stub(),
				},
			},
		};
	});

	afterEach(async () => {
		sandbox.restore();
	});

	test('can create a new card', async () => {
		const { commonProps, onDonePromise } = context;

		let callbackCard = null;

		const card = {
			onDone: {
				action: 'open',
				callback: (newCard) => {
					callbackCard = newCard;
					onDonePromise.resolver();
				},
			},
			seed,
			types: [contact],
		};

		const createLensComponent = await mountCreateLens(commonProps, card);
		enterName(createLensComponent);
		submit(createLensComponent);

		expect(commonProps.sdk.card.create.calledOnce).toBe(true);
		expect(commonProps.actions.createLink.notCalled).toBe(true);
		await onDonePromise.promise;
		expect(callbackCard).toEqual(createdCard);
	});

	test('can link to multiple cards after creation', async () => {
		const { commonProps, onDonePromise } = context;

		let callbackCard = null;
		const targets = [account1, account2];

		const card = {
			onDone: {
				action: 'link',
				targets,
				callback: (newCard) => {
					callbackCard = newCard;
					onDonePromise.resolver();
				},
			},
			seed,
			types: [contact],
		};

		const createLensComponent = await mountCreateLens(commonProps, card);
		enterName(createLensComponent);
		submit(createLensComponent);

		await onDonePromise.promise;
		expect(commonProps.sdk.card.create.calledOnce).toBe(true);
		expect(commonProps.actions.createLink.callCount).toBe(targets.length);
		expect(commonProps.actions.removeChannel.calledOnce).toBe(true);
		expect(callbackCard).toEqual(createdCard);
	});

	test('Calls the onLink callback if set', async () => {
		const { commonProps, onDonePromise, onLinkPromise } = context;

		let callbackCard = null;
		let onLinkCard = null;
		const targets = [account1, account2];

		const card = {
			onDone: {
				action: 'link',
				targets,
				onLink: (newCard) => {
					onLinkCard = newCard;
					onLinkPromise.resolver();
				},
				callback: (newCard) => {
					callbackCard = newCard;
					onDonePromise.resolver();
				},
			},
			seed,
			types: [contact],
		};

		const createLensComponent = await mountCreateLens(commonProps, card);
		enterName(createLensComponent);
		submit(createLensComponent);

		await onLinkPromise.promise;
		await onDonePromise.promise;
		expect(commonProps.sdk.card.create.calledOnce).toBe(true);
		expect(commonProps.actions.createLink.callCount).toBe(0);
		expect(commonProps.actions.removeChannel.calledOnce).toBe(true);
		expect(callbackCard).toEqual(createdCard);
		expect(onLinkCard).toEqual(createdCard);
	});

	test('throws exception if trying to link cards of different types', async () => {
		expect.assertions(1);
		const { commonProps } = context;

		// Note the targets are of different types
		const targets = [account1, user1];

		const card = {
			onDone: {
				action: 'link',
				targets,
			},
			seed,
			types: [contact],
		};

		try {
			await mountCreateLens(commonProps, card);
		} catch (e) {
			expect(e.message).toBe('All target cards must be of the same type');
		}
	});
});
