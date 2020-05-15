/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../../../../../test/ui-setup'
import ava from 'ava'
import {
	shallow
} from 'enzyme'
import React from 'react'
import sinon from 'sinon'
import CardTable from '../CardTable'
import props from './fixtures/props.json'

const {
	channel,
	tail,
	page,
	totalPages,
	type,
	user,
	types
} = props

ava('It should render', (test) => {
	const setPageStub = sinon.spy()

	test.notThrows(() => {
		shallow(
			<CardTable
				channel={channel}
				tail={tail}
				page={page}
				totalPages={totalPages}
				type={type}
				user={user}
				types={types}
				setPage={setPageStub}
			/>
		)
	})
})

ava('It should trigger setPage when clicking the pager button next', (test) => {
	const setPageStub = sinon.spy()

	const component = shallow(<CardTable
		channel={channel}
		tail={tail}
		page={page}
		totalPages={totalPages}
		type={type}
		user={user}
		types={types}
		setPage={setPageStub}
	/>)

	component.find('Table')
		.dive()
		.find('Pager')
		.first()
		.dive()
		.find('.rendition-pager__btn--next')
		.simulate('click')

	test.true(setPageStub.calledOnce)
})
