/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper
} from '../../../../../test/ui-setup'
import ava from 'ava'
import {
	shallow,
	mount
} from 'enzyme'
import React from 'react'
import sinon from 'sinon'
import CardTable from '../CardTable'
import props from './fixtures/props.json'

const sandbox = sinon.createSandbox()

const wrappingComponent = getWrapper().wrapper

const {
	channel,
	tail,
	page,
	totalPages,
	type,
	user,
	allTypes
} = props

const mountCardTable = async (actions, setPageStub) => {
	return mount((
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
		/>
	), {
		wrappingComponent
	})
}

const checkRow = (component, rowIndex) => {
	const tableBody = component.find('div[data-display="table-body"]')
	const rows = tableBody.find('div[data-display="table-row"]')
	const firstCheckbox = rows.at(rowIndex).find('div[data-display="table-cell"]').first().find('input')
	firstCheckbox.simulate('change', {
		target: {
			checked: true
		}
	})
}

const openActions = (component) => {
	component.find('button[data-test="cardTableActions__dropdown"]').simulate('click')
}

const takeAction = (component, action) => {
	component.find(`a[data-test="cardTableActions__${action}"]`).simulate('click')
}

ava.beforeEach(async (test) => {
	test.context = {
		...test.context,
		setPageStub: sinon.spy(),
		actions: {
			addChannel: sinon.stub().resolves(null),
			createLink: sinon.stub().resolves(null)
		}
	}
})

ava.afterEach(async (test) => {
	sandbox.restore()
})

ava('It should render', (test) => {
	const {
		setPageStub
	} = test.context

	test.notThrows(() => {
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
			/>
		)
	})
})

ava('It should trigger setPage when clicking the pager button next', async (test) => {
	const {
		setPageStub,
		actions
	} = test.context

	const cardTableComponent = await mountCardTable(actions, setPageStub)

	cardTableComponent
		.find('.rendition-pager__btn--next')
		.first()
		.simulate('click')

	test.true(setPageStub.calledOnce)
})

ava('It should let you select multiple cards', async (test) => {
	const {
		setPageStub,
		actions
	} = test.context

	const cardTableComponent = await mountCardTable(actions, setPageStub)

	checkRow(cardTableComponent, 0)
	checkRow(cardTableComponent, 1)

	test.is(cardTableComponent.state().checkedCards.length, 2)
})

ava('It should let you link multiple selected cards to a newly created card', async (test) => {
	const {
		setPageStub,
		actions
	} = test.context

	const cardTableComponent = await mountCardTable(actions, setPageStub)

	checkRow(cardTableComponent, 0)
	checkRow(cardTableComponent, 1)
	openActions(cardTableComponent)
	takeAction(cardTableComponent, 'link-new')

	test.true(actions.addChannel.calledOnce)
	const newChannel = actions.addChannel.getCall(0).args[0]
	test.deepEqual(newChannel, {
		head: {
			seed: {
				markers: channel.data.head.markers
			},
			onDone: {
				action: 'link',

				// We're linking the first two cards in the table
				targets: [ tail[0], tail[1] ]
			}
		},
		format: 'create',
		canonical: false
	})
})

ava('It should let you link multiple selected cards to an existing card', async (test) => {
	const {
		setPageStub,
		actions
	} = test.context

	const cardTableComponent = await mountCardTable(actions, setPageStub)

	checkRow(cardTableComponent, 0)
	checkRow(cardTableComponent, 1)
	openActions(cardTableComponent)
	takeAction(cardTableComponent, 'link-existing')

	test.is(cardTableComponent.state().showLinkModal, 'link')
})
