/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	mount,
	shallow,
	configure
} from 'enzyme'
import React from 'react'
import {
	Provider
} from 'rendition'
import StepsFlow from './StepsFlow'
import Adapter from 'enzyme-adapter-react-16'

const browserEnv = require('browser-env')
browserEnv([ 'window', 'document', 'navigator' ])

configure({
	adapter: new Adapter()
})

const stepsProps = {
	titleText: 'Test flow'
}

ava('StepsFlow should render', (test) => {
	test.notThrows(() => {
		shallow(
			<StepsFlow stepsProps={stepsProps}>
				<StepsFlow.Step label="Step 1" status="completed">
					<div className="step1">Step 1</div>
				</StepsFlow.Step>
				<StepsFlow.Step label="Step 2" status="pending">
					<div className="step2">Step 2</div>
				</StepsFlow.Step>
			</StepsFlow>
		)
	})
})

ava('initialStep is respected', (test) => {
	const component = mount(
		<Provider>
			<StepsFlow initialStep={1} stepsProps={stepsProps}>
				<StepsFlow.Step label="Step 1" status="completed">
					<div className="step1">Step 1</div>
				</StepsFlow.Step>
				<StepsFlow.Step label="Step 2" status="pending">
					<div className="step2">Step 2</div>
				</StepsFlow.Step>
			</StepsFlow>
		</Provider>
	)

	const stepHeading = component.find('h5[data-test="flow-step-1__heading"]')
	test.is(stepHeading.text(), 'Step 2')
})

ava('initialStep cannot be greater than number of steps', (test) => {
	test.throws(() => {
		shallow(
			<StepsFlow initialStep={3} stepsProps={stepsProps}>
				<StepsFlow.Step label="Step 1" status="completed">
					<div className="step1">Step 1</div>
				</StepsFlow.Step>
				<StepsFlow.Step label="Step 2" status="pending">
					<div className="step2">Step 2</div>
				</StepsFlow.Step>
			</StepsFlow>
		)
	})
})

ava('Invalid child components are not allowed', (test) => {
	test.throws(() => {
		shallow(
			<StepsFlow initialStep={3} stepsProps={stepsProps}>
				<StepsFlow.Step label="Step 1" status="completed">
					<div className="step1">Step 1</div>
				</StepsFlow.Step>
				<div>Illegal!</div>
			</StepsFlow>
		)
	})
})

ava('Invalid status values are not allowed', (test) => {
	test.throws(() => {
		shallow(
			<StepsFlow initialStep={3} stepsProps={stepsProps}>
				<StepsFlow.Step label="Step 1" status="unknown">
					<div className="step1">Step 1</div>
				</StepsFlow.Step>
			</StepsFlow>
		)
	})
})
