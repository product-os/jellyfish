/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper
} from '../../../../test/ui-setup'
import ava from 'ava'
import {
	shallow,
	mount
} from 'enzyme'
import React from 'react'
import {
	TagList
} from '../'

const wrappingComponent = getWrapper().wrapper

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
			wrappingComponent
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
