/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import sinon from 'sinon'
import {
	getTrigger
} from './triggers'

const sandbox = sinon.createSandbox()

const USER = {
	links: {
		'is member of': {
			slug: 'org-fakeorg',
			type: 'org@1.0.0'
		}
	}
}

ava.afterEach(() => {
	sandbox.restore()
})

ava('A user matching the @ tag is displayed as a slug when the user has no first-name or last-name value', async (test) => {
	const sdk = {
		query: sandbox.stub()
	}
	sdk.query.resolves([ {
		slug: 'user-without-name'
	} ])

	const triggers = getTrigger([], sdk, USER)
	const {
		dataProvider,
		component
	} = triggers['@']

	const [ matchingUser ] = await dataProvider('@without-name')
	const div = component({
		entity: matchingUser
	})
	test.is(div.props.children, '@without-name')
})

ava('A user matching the @ tag is displayed with ' +
'their slug and first name when the user has a first but no last-name value', async (test) => {
	const sdk = {
		query: sandbox.stub()
	}
	sdk.query.resolves([ {
		slug: 'user-john',
		data: {
			profile: {
				name: {
					first: 'John'
				}
			}
		}
	} ])

	const triggers = getTrigger([], sdk, USER)
	const {
		dataProvider,
		component
	} = triggers['@']

	const [ matchingUser ] = await dataProvider('@john')
	const div = component({
		entity: matchingUser
	})
	test.is(div.props.children, '@john (John)')
})

ava('A user matching the @ tag is displayed with ' +
'their slug and last name when the user has a last-name but no first-name value', async (test) => {
	const sdk = {
		query: sandbox.stub()
	}
	sdk.query.resolves([ {
		slug: 'user-john',
		data: {
			profile: {
				name: {
					last: 'Smith'
				}
			}
		}
	} ])

	const triggers = getTrigger([], sdk, USER)
	const {
		dataProvider,
		component
	} = triggers['@']

	const [ matchingUser ] = await dataProvider('@john')
	const div = component({
		entity: matchingUser
	})
	test.is(div.props.children, '@john (Smith)')
})

ava('A user matching the @ tag is displayed with ' +
'their slug and their first name and last name when the user has a first-name and last-name value', async (test) => {
	const sdk = {
		query: sandbox.stub()
	}
	sdk.query.resolves([ {
		slug: 'user-john',
		data: {
			profile: {
				name: {
					first: 'John',
					last: 'Smith'
				}
			}
		}
	} ])

	const triggers = getTrigger([], sdk, USER)
	const {
		dataProvider,
		component
	} = triggers['@']

	const [ matchingUser ] = await dataProvider('@john')
	const div = component({
		entity: matchingUser
	})
	test.is(div.props.children, '@john (John Smith)')
})
