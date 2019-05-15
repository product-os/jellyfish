/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	shallow
} from 'enzyme'
import React from 'react'
import Filters from '../'

const schema = {
	type: 'object',
	properties: {
		Name: {
			title: 'Pokemon Name',
			type: 'string'
		}
	}
}

ava('It should render', (test) => {
	test.notThrows(() => {
		shallow(<Filters schema={schema} />)
	})
})
