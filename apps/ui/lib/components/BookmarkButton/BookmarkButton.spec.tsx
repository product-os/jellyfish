/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { getWrapper } from '../../../test/ui-setup';
import { mount } from 'enzyme';
import _ from 'lodash';
import sinon from 'sinon';
import React from 'react';
import { BookmarkButton } from './BookmarkButton';

const wrappingComponent = getWrapper().wrapper;

const sandbox = sinon.createSandbox();

const user = {
	slug: 'user-1',
	id: '1',
	type: 'user@1.0.0',
};

const card = {
	slug: 'card-2',
	id: '2',
	type: 'card@1.0.0',
};

const sdk = {
	card: {
		link: sandbox.fake(),
		unlink: sandbox.fake(),
	},
};

describe('BookmarkButton', () => {
	afterEach(() => {
		sandbox.reset();
	});

	it('can add a bookmark link if the contract is not already bookmarked', async () => {
		const component = await mount(
			<BookmarkButton user={user} card={card} sdk={sdk} />,
			{
				wrappingComponent,
			},
		);

		const icon = component.find('Icon').first();
		// Icon is not solid, indicating the card is _not_ bookmarked
		expect(icon.prop('regular')).toBe(true);

		component.find('button').first().simulate('click');
		expect(sdk.card.link.calledOnce).toBe(true);
		const [from, to, verb] = sdk.card.link.getCall(0).args;
		expect(from).toEqual(card);
		expect(to).toEqual(user);
		expect(verb).toBe('is bookmarked by');
	});

	it('can remove a bookmark link if the contract is already bookmarked', async () => {
		const bookmarkedCard = _.merge({}, card, {
			links: {
				'is bookmarked by': [user],
			},
		});
		const component = await mount(
			<BookmarkButton user={user} card={bookmarkedCard} sdk={sdk} />,
			{
				wrappingComponent,
			},
		);

		const icon = component.find('Icon').first();
		// Icon is solid, indicating the card _is_ bookmarked
		expect(icon.prop('regular')).toBe(false);

		component.find('button').first().simulate('click');
		expect(sdk.card.unlink.calledOnce).toBe(true);
		const [from, to, verb] = sdk.card.unlink.getCall(0).args;
		expect(from).toEqual(bookmarkedCard);
		expect(to).toEqual(user);
		expect(verb).toBe('is bookmarked by');
	});
});
