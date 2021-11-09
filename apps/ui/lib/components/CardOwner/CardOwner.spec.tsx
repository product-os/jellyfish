/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../../test/ui-setup';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import React from 'react';
import CardOwner from './CardOwner';

const user1 = {
	id: 1,
	name: 'User 1',
	slug: 'user1',
	type: 'user@1.0.0',
};

const user2 = {
	id: 2,
	name: 'User 2',
	slug: 'user2',
	type: 'user@1.0.0',
};

const types = [
	{
		name: 'user',
		slug: 'user',
	},
	{
		name: 'Support Thread',
		slug: 'support-thread',
	},
];

const card = {
	id: '1',
	slug: 'support-thread-1',
	type: 'support-thread@1.0.0',
};

const sandbox = sinon.createSandbox();

const getSdk = (owner?) => {
	return {
		event: {
			create: sandbox.fake.resolves({
				slug: 'new-event',
			}),
		},
		card: {
			unlink: sandbox.fake.resolves(true),
			link: sandbox.fake.resolves({
				slug: 'new-link',
			}),
			getWithLinks: sandbox.fake.resolves({
				id: '1',
				links: {
					'is owned by': owner ? [owner] : [],
				},
			}),
		},
	};
};

describe('CardOwner', () => {
	afterEach(async () => {
		sandbox.restore();
	});

	test('should render', () => {
		expect(() => {
			shallow(
				<CardOwner
					user={user1}
					types={types}
					card={card}
					cardOwner={user1}
					sdk={getSdk(user1)}
				/>,
			);
		}).not.toThrow();
	});

	describe('Initial state is correct', () => {
		test("when I'm the owner", () => {
			const cardOwner = shallow(
				<CardOwner
					user={user1}
					types={types}
					card={card}
					cardOwner={user1}
					sdk={getSdk(user1)}
				/>,
			);
			cardOwner.update();

			// Name is displayed as a label
			expect(shallow(cardOwner.props().label).text()).toBe(user1.name);

			// "Assign to me" menu item is not rendered'
			expect(
				cardOwner.find('[data-test="card-owner-menu__assign-to-me"]').exists(),
			).toBe(false);

			// "Unassign" menu item is displayed'
			expect(
				cardOwner.find('[data-test="card-owner-menu__unassign"]').exists(),
			).toBe(true);
		});

		test('when there is no owner', async () => {
			const cardOwner = await shallow(
				<CardOwner
					user={user1}
					types={types}
					card={card}
					cardOwner={null}
					sdk={getSdk()}
				/>,
			);
			cardOwner.update();

			// "Assign to me" text is displayed as a label'
			expect(shallow(cardOwner.props().label).text()).toBe('Assign to me');

			// "Assign to me" menu item is not rendered'
			expect(
				cardOwner.find('[data-test="card-owner-menu__assign-to-me"]').exists(),
			).toBe(false);

			// "Unassign" menu item is not rendered'
			expect(
				cardOwner.find('[data-test="card-owner-menu__unassign"]').exists(),
			).toBe(false);
		});

		test('when other user is an owner', async () => {
			const cardOwner = await shallow(
				<CardOwner
					user={user1}
					types={types}
					card={card}
					cardOwner={user2}
					sdk={getSdk(user2)}
				/>,
			);
			cardOwner.update();

			// "owner's name is displayed as a label"
			expect(shallow(cardOwner.props().label).text()).toBe(user2.name);

			// "Assign to me" menu item is displayed'
			expect(
				cardOwner.find('[data-test="card-owner-menu__assign-to-me"]').exists(),
			).toBe(true);

			// "Unassign" menu item is displayed'
			expect(
				cardOwner.find('[data-test="card-owner-menu__unassign"]').exists(),
			).toBe(true);
		});
	});
});
