/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import sinon from 'sinon'
import groupTrigger from '../group-trigger'
import {
	getComponentFromTrigger,
	getOutputFromTrigger
} from './helpers'

const TAG = '@@'
const GROUP_NAME = 'fake-group'

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	test.context = {
		...test.context,
		sdk: {
			query: sandbox.stub()
		}
	}
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('The correct tag is returned in the component and output of the group trigger', async (test) => {
	const {
		sdk
	} = test.context

	sdk.query.resolves([ {
		name: GROUP_NAME
	} ])

	const atTag = '@@'
	const atTrigger = await groupTrigger(sdk, atTag)
	const atDiv = await getComponentFromTrigger(atTrigger, atTag, GROUP_NAME)
	const atOutput = await getOutputFromTrigger(atTrigger, atTag, GROUP_NAME)
	test.is(atDiv.props.children, `${atTag}${GROUP_NAME}`)
	test.is(atOutput, `${atTag}${GROUP_NAME}`)

	const exclamationTag = '!!'
	const exclamationTrigger = await groupTrigger(sdk, exclamationTag)
	const exclamationDiv = await getComponentFromTrigger(exclamationTrigger, exclamationTag, GROUP_NAME)
	const exclamationOutput = await getOutputFromTrigger(exclamationTrigger, exclamationTag, GROUP_NAME)
	test.is(exclamationDiv.props.children, `${exclamationTag}${GROUP_NAME}`)
	test.is(exclamationOutput, `${exclamationTag}${GROUP_NAME}`)
})

ava('A group matching the search term is displayed by its name', async (test) => {
	const {
		sdk
	} = test.context

	sdk.query.resolves([ {
		name: GROUP_NAME
	} ])

	const trigger = await groupTrigger(sdk, TAG)
	const div = await getComponentFromTrigger(trigger, TAG, GROUP_NAME)
	test.is(div.props.children, `${TAG}${GROUP_NAME}`)
})

ava('A group is outputted as the tag plus its name', async (test) => {
	const {
		sdk
	} = test.context

	sdk.query.resolves([ {
		name: GROUP_NAME
	} ])

	const trigger = await groupTrigger(sdk, TAG)
	const output = await getOutputFromTrigger(trigger, TAG, GROUP_NAME)
	test.is(output, `${TAG}${GROUP_NAME}`)
})
