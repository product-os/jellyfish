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
import React from 'react'
import CreateView from '../CreateView'

// HACK: Don't use the standard test/ui-setup as it causes problems
// with CreateView if the XMLHttpRequest global is declared
import Adapter from 'enzyme-adapter-react-16'

configure({
	adapter: new Adapter()
})

ava('It should render', (test) => {
	test.notThrows(() => {
		shallow(<CreateView />)
	})
})
