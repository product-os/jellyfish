/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import sinon from 'sinon'
import tagTrigger from '../tag-trigger'

const TAGS = [ {
	name: 'tag-rare',
	data: {
		count: 1
	}
}, {
	name: 'tag-common',
	data: {
		count: '100'
	}
} ]

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	test.context = {
		sdk: {
			query: sandbox.stub()
		}
	}
})

ava('The tagTrigger returns matches sorted by count', async (test) => {
	const {
		sdk
	} = test.context

	sdk.query.resolves(TAGS)

	const {
		dataProvider
	} = await tagTrigger(sdk)

	const [ first, second ] = await dataProvider('tag')
	test.is(first.name, 'tag-common')
	test.is(second.name, 'tag-rare')
})

ava('The tagTrigger renders the name and count of a matched tag', async (test) => {
	const {
		sdk
	} = test.context

	sdk.query.resolves(TAGS)

	const {
		dataProvider,
		component
	} = await tagTrigger(sdk)

	const [ tag ] = await dataProvider('tag-common')
	const flex = component({
		entity: tag
	})

	const tagNameTxt = flex.props.children[0]
	test.deepEqual(tagNameTxt.props.children, [ '#', 'tag-common' ])

	const tagCountTxt = flex.props.children[1]
	test.deepEqual(tagCountTxt.props.children, [ 'x ', '100' ])
})

ava('The tagTrigger outputs a tag correctly', async (test) => {
	const {
		sdk
	} = test.context

	sdk.query.resolves(TAGS)

	const {
		dataProvider,
		output
	} = await tagTrigger(sdk)

	const [ tag ] = await dataProvider('tag-common')
	const result = output(tag)
	test.is(result, '#tag-common')
})
