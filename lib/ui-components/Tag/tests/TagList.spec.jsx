/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	shallow,
	mount,
	configure
} from 'enzyme'
import React from 'react'
import {
	Provider
} from 'rendition'
import {
	TagList
} from '../'

import Adapter from 'enzyme-adapter-react-16'

const browserEnv = require('browser-env')
browserEnv([ 'window', 'document', 'navigator' ])

configure({
	adapter: new Adapter()
})

ava('Tags are filtered if they appear in the blacklist', (test) => {
	const tagList = shallow(<TagList tags={[ 'tag1', 'tag2' ]} blacklist={[ 'tag1' ]} />)
	const tags = tagList.find('Tag')
	test.is(tags.length, 1)

	// Note: because this is a shallow render, the child of the Tag doesn't have the # prefix yet
	test.is(tags.at(0).children().text(), 'tag2')
})

ava('Tags are automatically prefixed with a hashtag', (test) => {
	const tagList = mount(
		<TagList tags={[ '#tag1', 'tag2' ]} />,
		{
			wrappingComponent: Provider
		})
	const tags = tagList.find('Tag')
	test.is(tags.length, 2)
	test.is(tags.at(0).children().text(), '#tag1')
	test.is(tags.at(1).children().text(), '#tag2')
})

ava('#tag1 and tag1 are considered the same and de-duplicated', (test) => {
	const tagList = shallow(<TagList tags={[ 'tag1', '#tag1' ]} />)
	const tags = tagList.find('Tag')
	test.is(tags.length, 1)
})
