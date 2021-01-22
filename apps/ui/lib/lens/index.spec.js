/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../test/ui-setup'
import ava from 'ava'
import {
	getLenses
} from './index'

const user = {
	id: 'u-1',
	slug: 'user-1'
}

const data = [
	{
		id: 'st-1',
		type: 'support-thread@1.0.0'
	}
]

ava('getLenses can be used to return one lens per icon', (test) => {
	let lenses = getLenses('list', data, user)
	test.true(lenses.filter((lens) => lens.data.icon === 'address-card').length > 1)
	lenses = getLenses('list', data, user, 'data.icon')
	test.is(lenses.filter((lens) => lens.data.icon === 'address-card').length, 1)
})
