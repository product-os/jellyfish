/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper
} from '../../../../../../test/ui-setup'
import ava from 'ava'
import {
	shallow,
	mount
} from 'enzyme'
import React from 'react'
import PullRequestChart from '../PullRequestChart'
import sampleData from './cards.json'

const wrappingComponent = getWrapper().wrapper

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
		<PullRequestChart tail={tail} />, {
			wrappingComponent
		}
	)

	test.true(component.find('canvas').exists())
})
