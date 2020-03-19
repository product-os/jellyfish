/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	shallow,
	configure,
	mount
} from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import React from 'react'
import {
	Provider
} from 'rendition'
import PullRequestChart from '../PullRequestChart'
import sampleData from './cards.json'

const browserEnv = require('browser-env')
browserEnv([ 'window', 'document', 'navigator' ])

configure({
	adapter: new Adapter()
})

ava('It should render', (test) => {
	const tail = sampleData.slice()

	test.notThrows(() => {
		shallow(
			<PullRequestChart tail={tail} />
		)
	})
})

ava('It should use a canvas tag to render a chart', (test) => {
	const tail = sampleData.slice()

	const component = mount(
		<Provider>
			<PullRequestChart tail={tail} />
		</Provider>
	)

	test.true(component.find('canvas').exists())
})
