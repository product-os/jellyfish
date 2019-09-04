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
import MyUser from '../../../../../../apps/ui/lens/full/MyUser/MyUser'
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
