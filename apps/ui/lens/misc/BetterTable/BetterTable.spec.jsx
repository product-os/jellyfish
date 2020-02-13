/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	shallow,
	configure
} from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import React from 'react'
import {
	BetterTable
} from '../BetterTable'
import props from './fixtures/props.json'

configure({
	adapter: new Adapter()
})

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
	test.notThrows(() => {
		shallow(<BetterTable
			channel={channel}
			tail={tail}
			page={page}
			totalPages={totalPages}
			type={type}
			user={user}
			types={types}
		/>)
	})
})

ava('It should show the same amount of table rows as the length of tail', (test) => {
	const component = shallow(<BetterTable
		channel={channel}
		tail={tail}
		page={page}
		totalPages={totalPages}
		type={type}
		user={user}
		types={types}
	/>)

	const tableRows = component
		.find('[data-test="table-component"]')
		.dive()
		.find('[data-display="table-body"] > TableRow')

	test.is(tableRows.length, tail.length)
})

ava('it should set the "Due Date" to "Due" if it has past', (test) => {
	const component = shallow(<BetterTable
		channel={channel}
		tail={tail}
		page={page}
		totalPages={totalPages}
		type={type}
		user={user}
		types={types}
	/>)

	const FirstDateString = component
		.find('[data-test="table-component"]')
		.dive()
		.find('[data-display="table-body"] > TableRow')
		.first()
		.dive()
		.find('[data-test="due-date"]')

	const SecondDateString = component
		.find('[data-test="table-component"]')
		.dive()
		.find('[data-display="table-body"] > TableRow')
		.at(1)
		.dive()
		.find('[data-test="due-date"]')

	// Because date formatting changes based on Browser language
	// This test should check if the word "Due" is included before the date
	// this test will be invalid in the year 2320
	test.is(FirstDateString.text().includes('Due'), true)
	test.is(SecondDateString.text().includes('Due'), false)
})
