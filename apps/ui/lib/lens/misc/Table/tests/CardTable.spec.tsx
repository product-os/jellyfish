/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { getWrapper } from '../../../../../test/ui-setup';
import { shallow, mount } from 'enzyme';
import React from 'react';
import sinon from 'sinon';
import { CardTable } from "../CardTable";
import props from './fixtures/props.json';

const sandbox = sinon.createSandbox();

const { channel, tail, page, totalPages, type, user, allTypes } = props;

const wrappingComponent = getWrapper({
	core: {
		types: allTypes,
	},
}).wrapper;

const mountCardTable = async (actions, setPageStub) => {
	return mount(
		<CardTable
			actions={actions}
			channel={channel}
			tail={tail}
			page={page}
			totalPages={totalPages}
			type={type}
			user={user}
			allTypes={allTypes}
			setPage={setPageStub}
			lensState={{}}
		/>,
		{
			wrappingComponent,
		},
	);
};

const checkRow = (component, rowIndex) => {
	const tableBody = component.find('div[data-display="table-body"]');
	const rows = tableBody.find('div[data-display="table-row"]');
	const firstCheckbox = rows
		.at(rowIndex)
		.find('div[data-display="table-cell"]')
		.first()
		.find('input');
	firstCheckbox.simulate('change', {
		target: {
			checked: true,
		},
	});
};

const openActions = (component) => {
	component
		.find('button[data-test="cardTableActions__dropdown"]')
		.simulate('click');
};

const takeAction = (component, action) => {
	component
		.find(`a[data-test="cardTableActions__${action}"]`)
		.simulate('click');
};

let context: any = {};

describe('CardTable lens', () => {
	beforeEach(async () => {
		context = {
			setPageStub: sinon.spy(),
			actions: {
				addChannel: sinon.stub().resolves(null),
				createLink: sinon.stub().resolves(null),
			},
		};
	});

	afterEach(async () => {
		sandbox.restore();
	});

	test('should render', () => {
		const { setPageStub } = context;

		expect(() => {
			shallow(
				<CardTable
					channel={channel}
					tail={tail}
					page={page}
					totalPages={totalPages}
					type={type}
					user={user}
					allTypes={allTypes}
					setPage={setPageStub}
					lensState={{}}
				/>,
			);
		}).not.toThrow();
	});

	test('should trigger setPage when clicking the pager button next', async () => {
		const { setPageStub, actions } = context;

		const cardTableComponent = await mountCardTable(actions, setPageStub);

		cardTableComponent
			.find('.rendition-pager__btn--next')
			.first()
			.simulate('click');

		expect(setPageStub.calledOnce).toBe(true);
	});

	test('should let you select multiple cards', async () => {
		const { setPageStub, actions } = context;

		const cardTableComponent = await mountCardTable(actions, setPageStub);

		checkRow(cardTableComponent, 0);
		checkRow(cardTableComponent, 1);

		expect(cardTableComponent.state().checkedCards.length).toBe(2);
	});

	test('It should let you link multiple selected cards to a newly created card', async () => {
		const { setPageStub, actions } = context;

		const cardTableComponent = await mountCardTable(actions, setPageStub);

		checkRow(cardTableComponent, 0);
		checkRow(cardTableComponent, 1);
		openActions(cardTableComponent);
		takeAction(cardTableComponent, 'link-new');

		expect(actions.addChannel.calledOnce).toBe(true);
		const newChannel = actions.addChannel.getCall(0).args[0];
		expect(newChannel).toEqual({
			head: {
				seed: {
					markers: channel.data.head.markers,
					loop: channel.data.head.loop,
				},
				onDone: {
					action: 'link',

					// We're linking the first two cards in the table
					targets: [tail[0], tail[1]],
				},
			},
			format: 'create',
			canonical: false,
		});
	});

	test('should let you link multiple selected cards to an existing card', async () => {
		const { setPageStub, actions } = context;

		const cardTableComponent = await mountCardTable(actions, setPageStub);

		checkRow(cardTableComponent, 0);
		checkRow(cardTableComponent, 1);
		openActions(cardTableComponent);
		takeAction(cardTableComponent, 'link-existing');

		expect(cardTableComponent.state().showLinkModal).toBe('link');
	});
});
