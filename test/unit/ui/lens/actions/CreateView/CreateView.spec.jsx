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
import CreateView from '../../../../../../apps/ui/lens/actions/CreateView/CreateView'

ava('It should render', (test) => {
	test.notThrows(() => {
		shallow(<CreateView />)
	})
})
