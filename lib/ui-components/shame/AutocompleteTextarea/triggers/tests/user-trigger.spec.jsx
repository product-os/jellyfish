/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import sinon from 'sinon'
import userTrigger from '../user-trigger'
import {
	getComponentFromTrigger,
	getOutputFromTrigger
} from './helpers'

const sandbox = sinon.createSandbox()

const USER = {
	links: {
		'is member of': {
			slug: 'org-fakeorg',
			type: 'org@1.0.0'
		}
	}
}

const FIRSTNAME = 'John'
const LASTNAME = 'Smith'
const SLUG = 'user-john'
const TAG = '@'
const USERNAME = 'john'

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

ava('The correct tag is returned in the component and output of the user trigger', async (test) => {
	const {
		sdk
	} = test.context

	sdk.query.resolves([ {
		slug: SLUG
	} ])

	const atTag = '@'
	const atTrigger = await userTrigger(USER, sdk, atTag)
	const atDiv = await getComponentFromTrigger(atTrigger, atTag, USERNAME)
	const atOutput = await getOutputFromTrigger(atTrigger, atTag, USERNAME)
	test.is(atDiv.props.children, `${atTag}${USERNAME}`)
	test.is(atOutput, `${atTag}${USERNAME}`)

	const exclamationTag = '!'
	const exclamationTrigger = await userTrigger(USER, sdk, exclamationTag)
	const exclamationDiv = await getComponentFromTrigger(exclamationTrigger, exclamationTag, USERNAME)
	const exclamationOutput = await getOutputFromTrigger(exclamationTrigger, exclamationTag, USERNAME)
	test.is(exclamationDiv.props.children, `${exclamationTag}${USERNAME}`)
	test.is(exclamationOutput, `${exclamationTag}${USERNAME}`)
})

ava('A user matching the search term is displayed as a slug when the user has no first-name or last-name value', async (test) => {
	const {
		sdk
	} = test.context

	sdk.query.resolves([ {
		slug: SLUG
	} ])

	const trigger = await userTrigger(USER, sdk, TAG)
	const div = await getComponentFromTrigger(trigger, TAG, USERNAME)
	test.is(div.props.children, `${TAG}${USERNAME}`)
})

ava('A user matching the search term is displayed with ' +
'their slug and first name when the user has a first but no last-name value', async (test) => {
	const {
		sdk
	} = test.context

	sdk.query.resolves([ {
		slug: SLUG,
		data: {
			profile: {
				name: {
					first: FIRSTNAME
				}
			}
		}
	} ])

	const trigger = await userTrigger(USER, sdk, TAG)
	const div = await getComponentFromTrigger(trigger, TAG, USERNAME)
	test.is(div.props.children, `${TAG}${USERNAME} (${FIRSTNAME})`)
})

ava('A user matching the search term is displayed with ' +
'their slug and last name when the user has a last-name but no first-name value', async (test) => {
	const {
		sdk
	} = test.context

	sdk.query.resolves([ {
		slug: SLUG,
		data: {
			profile: {
				name: {
					last: LASTNAME
				}
			}
		}
	} ])

	const trigger = await userTrigger(USER, sdk, TAG)
	const div = await getComponentFromTrigger(trigger, TAG, USERNAME)
	test.is(div.props.children, `${TAG}${USERNAME} (${LASTNAME})`)
})

ava('A user matching the search term is displayed with ' +
'their slug and their first name and last name when the user has a first-name and last-name value', async (test) => {
	const {
		sdk
	} = test.context

	sdk.query.resolves([ {
		slug: SLUG,
		data: {
			profile: {
				name: {
					first: FIRSTNAME,
					last: LASTNAME
				}
			}
		}
	} ])

	const trigger = await userTrigger(USER, sdk, TAG)
	const div = await getComponentFromTrigger(trigger, TAG, USERNAME)
	test.is(div.props.children, `${TAG}${USERNAME} (${FIRSTNAME} ${LASTNAME})`)
})

ava('The userTrigger outputs the user as a tag ' +
'plus the username, even when their first name and last name are present', async (test) => {
	const {
		sdk
	} = test.context

	sdk.query.resolves([ {
		slug: SLUG,
		data: {
			profile: {
				name: {
					first: FIRSTNAME,
					last: LASTNAME
				}
			}
		}
	} ])

	const trigger = await userTrigger(USER, sdk, TAG)
	const output = await getOutputFromTrigger(trigger, TAG, USERNAME)
	test.is(output, `${TAG}${USERNAME}`)
})
