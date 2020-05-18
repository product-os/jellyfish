/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper
} from '../../test/ui-setup'
import ava from 'ava'
import {
	mount
} from 'enzyme'
import {
	Txt
} from 'rendition'
import React from 'react'
import Collapsible from './Collapsible'

const wrappingComponent = getWrapper().wrapper

const Content = () => {
	return <Txt data-test="test-content">Content</Txt>
}

const mountCollapsible = (props) => {
	return mount((
		<Collapsible title='Test' {...props}>
			<Content />
		</Collapsible>
	), {
		wrappingComponent
	})
}

ava('Collapsible doesn\'t render content if collapsed and lazyLoadContent is set', async (test) => {
	const component = await mountCollapsible({
		lazyLoadContent: true
	})
	const content = component.find('Txt[data-test="test-content"]')
	test.is(content.length, 0)
})

ava('Collapsible renders (hidden) content if collapsed and lazyLoadContent is false', async (test) => {
	const component = await mountCollapsible({
		lazyLoadContent: false
	})
	const content = component.find('Txt[data-test="test-content"]')
	test.is(content.length, 1)
})

ava('Collapsible renders content if not collapsed', async (test) => {
	const component = await mountCollapsible({
		defaultCollapsed: false
	})
	const content = component.find('Txt[data-test="test-content"]')
	test.is(content.length, 1)
})

ava('Collapsible header is not displayed if collapsible prop is false', async (test) => {
	const component = await mountCollapsible({
		collapsible: false
	})
	const header = component.find('CollapsibleHeader[data-test="collapsible__header"]')
	test.is(header.length, 0)
})
