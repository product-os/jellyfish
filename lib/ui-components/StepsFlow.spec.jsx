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
	title: 'Test flow'
}

const getStep = (index, stepStatus) => {
	return (
		<StepsFlow.Step key={index} label={`Step ${index}`} status={stepStatus}>
			<div className={`step${index}`}>Step {index}</div>
		</StepsFlow.Step>
	)
}

const getShallowStepsFlow = ({
	status, ...props
}) => {
	const stepStatus = status || 'pending'
	return shallow(
		<StepsFlow {...stepsProps} {...props}>
			{[ 1, 2, 3 ].map((index) => { return getStep(index, stepStatus) })}
		</StepsFlow>
	)
}

const getMountedStepsFlow = ({
	status, ...props
}) => {
	const stepStatus = status || 'pending'
	return mount(
		<Provider>
			<StepsFlow {...stepsProps} {...props}>
				{[ 1, 2, 3 ].map((index) => { return getStep(index, stepStatus) })}
			</StepsFlow>
		</Provider>
	)
}

ava('StepsFlow should render', (test) => {
	test.notThrows(() => {
		getShallowStepsFlow({})
	})
})

ava('initialStep is respected', (test) => {
	const component = getMountedStepsFlow({
		initialStep: 1
	})

	const stepHeading = component.find('h5[data-test="flow-step-1__heading"]')
	test.is(stepHeading.text(), 'Step 2')
})

ava('Previous button is disabled on first step', (test) => {
	const component = getMountedStepsFlow({
		status: 'completed'
	})

	let prevButton = component.find('button[data-test="steps-flow__prev-btn"]')
	test.is(prevButton.prop('disabled'), true)

	const nextButton = component.find('button[data-test="steps-flow__next-btn"]')
	test.is(nextButton.prop('disabled'), false)

	nextButton.simulate('click')

	prevButton = component.find('button[data-test="steps-flow__prev-btn"]')
	test.is(prevButton.prop('disabled'), false)
})

ava('Next button is disabled if step is not completed', (test) => {
	const component = getMountedStepsFlow({
		status: 'pending'
	})

	const nextButton = component.find('button[data-test="steps-flow__next-btn"]')
	test.is(nextButton.prop('disabled'), true)
})

ava('Action button is displayed on last step', (test) => {
	const component = getMountedStepsFlow({
		initialStep: 2
	})

	const actionButton = component.find('button[data-test="steps-flow__action-btn"]')
	test.is(actionButton.prop('disabled'), true)

	const nextButton = component.find('button[data-test="steps-flow__next-btn"]')
	test.false(nextButton.exists())
})

ava('Action button is enabled if all steps are completed', (test) => {
	const component = getMountedStepsFlow({
		initialStep: 2,
		status: 'completed'
	})

	const actionButton = component.find('button[data-test="steps-flow__action-btn"]')
	test.is(actionButton.prop('disabled'), false)
})

ava('initialStep cannot be greater than number of steps', (test) => {
	test.throws(() => {
		getShallowStepsFlow({
			initialStep: 3
		})
	})
})

ava('Invalid child components are not allowed', (test) => {
	test.throws(() => {
		shallow(
			<StepsFlow initialStep={3} {...stepsProps}>
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
		getShallowStepsFlow({
			status: 'foobar'
		})
	})
})
