/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../test/ui-setup'
import ava from 'ava'
import _ from 'lodash'
import {
	getLenses,
	getLensForTarget
} from './index'

const user = {
	id: 'u-1',
	slug: 'user-1'
}

const data = [
	{
		id: 'st-1',
		slug: 'support-thread-1',
		type: 'support-thread@1.0.0',
		data: {
			status: 'open'
		}
	}
]

ava('getLenses can be used to return one lens per icon', (test) => {
	let lenses = getLenses('list', data, user)
	test.true(lenses.filter((lens) => lens.data.icon === 'address-card').length > 1)
	lenses = getLenses('list', data, user, 'data.icon')
	test.is(lenses.filter((lens) => lens.data.icon === 'address-card').length, 1)
})

ava('getLenses returns the support-threads, chart and kanban lenses for support thread data', (test) => {
	const lensSlugs = _.map(getLenses('list', data, user, 'data.icon'), 'slug')
	test.true(lensSlugs.includes('lens-support-threads'))
	test.true(lensSlugs.includes('lens-chart'))
	test.true(lensSlugs.includes('lens-kanban'))
})

ava('getLensForTarget returns the omni-search lens for the path \'search\'', (test) => {
	const lens = getLensForTarget('search')
	test.is(lens.slug, 'lens-omni-search')
})

ava('getLensForTarget returns the inbox lens for the path \'inbox\'', (test) => {
	const lens = getLensForTarget('inbox')
	test.is(lens.slug, 'lens-inbox')
})
