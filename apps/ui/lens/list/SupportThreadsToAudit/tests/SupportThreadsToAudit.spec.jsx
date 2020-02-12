/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	shallow,
	configure
} from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import React from 'react'
import SupportThreadsToAudit from '../SupportThreadsToAudit'

configure({
	adapter: new Adapter()
})

ava('It should render', (test) => {
	test.notThrows(() => {
		shallow(
			<SupportThreadsToAudit />
		)
	})
})
