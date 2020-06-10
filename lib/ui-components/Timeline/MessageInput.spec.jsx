/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper
} from '../../../test/ui-setup'
import React from 'react'
import ava from 'ava'
import {
	mount
} from 'enzyme'
import sinon from 'sinon'
import MessageInput from './MessageInput'

const wrappingComponent = getWrapper().wrapper
const sandbox = sinon.createSandbox()

ava.afterEach(async () => {
	sandbox.restore()
})

ava('MessageInput calls onFileChange when pasting files', (test) => {
	const handleFileChange = sandbox.spy()

	const wrapper = mount((
		<MessageInput
			files={[]}
			onFileChange={handleFileChange}
		/>
	), {
		wrappingComponent
	})

	const textarea = wrapper.find('textarea')
	const file = new File([ new Blob() ], 'image.png', {
		type: 'image/png'
	})

	textarea.simulate('paste', {
		clipboardData: {
			files: [ file ]
		}
	})

	test.true(
		handleFileChange.calledOnce,
		'onFileChange is called once'
	)

	test.is(
		handleFileChange.getCall(0).args[0][0],
		file,
		'onFileChange gets an array of pasted files as a first argument'
	)
})
