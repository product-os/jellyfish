/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import typeTrigger from '../type-trigger'

const ALL_TYPES = [ {
	slug: 'user'
}, {
	slug: 'org'
} ]

ava('The typeTrigger matches the search term to the correct card type', async (test) => {
	const {
		dataProvider
	} = typeTrigger(ALL_TYPES)

	const types = dataProvider('u')
	test.true(types.includes('?user'))
})

ava('The typeTrigger outputs the matched card type correctly', async (test) => {
	const {
		dataProvider,
		output
	} = typeTrigger(ALL_TYPES)

	const [ type ] = dataProvider('u')
	const result = output(type)
	test.is(result, '?user')
})
