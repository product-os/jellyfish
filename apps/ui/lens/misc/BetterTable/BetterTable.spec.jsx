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
