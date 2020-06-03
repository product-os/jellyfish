/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper,
	flushPromises
} from '../../../../test/ui-setup'
import ava from 'ava'
import {
	mount
} from 'enzyme'
import React from 'react'
import sinon from 'sinon'
import AuthenticatedImage from '../index'
import Icon from '../../shame/Icon'

const {
	wrapper
} = getWrapper()

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	const imageSrc = 'https://jel.ly.fish/icons/jellyfish.svg'
	const createObjectURL = sandbox.stub()
	createObjectURL.returns(imageSrc)
	global.URL.createObjectURL = createObjectURL

	const getFile = sandbox.stub()
	getFile.resolves()

	const openFile = sandbox.stub()
	openFile.resolves()
	global.window.open = openFile

	test.context = {
		...test.context,
		imageSrc,
		sdk: {
			getFile
		}
	}
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('Renders the spinning icon when the image has not loaded', (test) => {
	const {
		sdk
	} = test.context

	const component = mount(
		<AuthenticatedImage
			sdk={sdk}
		/>, {
			wrappingComponent: wrapper
		})
	const icon = component.find(Icon)
	test.is(icon.prop('name'), 'cog')
	test.is(icon.prop('spin'), true)
})

ava('An error message is rendered when the getFile commands returns an error', async (test) => {
	const {
		sdk
	} = test.context

	sdk.getFile.rejects(new Error('Could not retrieve image'))

	const component = mount(
		<AuthenticatedImage
			sdk={sdk}
			data-test='generic-error-message'
		/>, {
			wrappingComponent: wrapper
		})
	await flushPromises()
	component.update()

	const genericMessage = component.find('span[data-test="generic-error-message"]')
	test.is(genericMessage.text(), 'An error occurred whilst loading image')
})

ava('Renders the image returned by the sdk.getFile function', async (test) => {
	const {
		imageSrc,
		sdk
	} = test.context
	const component = mount(<
		AuthenticatedImage
		sdk={sdk}
	/>, {
		wrappingComponent: wrapper
	})
	await flushPromises()
	component.update()

	const img = component.find('img')
	test.is(img.length, 1)
	test.is(img.prop('src'), imageSrc)
})
