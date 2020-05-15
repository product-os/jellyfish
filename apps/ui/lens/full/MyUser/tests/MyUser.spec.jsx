/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../../../../../test/ui-setup'
import ava from 'ava'
import {
	shallow
} from 'enzyme'
import React from 'react'
import MyUser from '../MyUser'
import {
	user,
	userType
} from './fixtures'

ava('It should render', (test) => {
	test.notThrows(() => {
		shallow(
			<MyUser
				card={user}
				types={[ userType ]}
			/>
		)
	})
})
