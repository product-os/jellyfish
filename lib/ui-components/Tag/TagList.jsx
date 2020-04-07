/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Flex
} from 'rendition'
import Tag, {
	TAG_SYMBOL
} from './Tag'

const hashTagRegExp = new RegExp(`^${TAG_SYMBOL}`)

export default function TagList ({
	tags, blacklist, tagProps, ...restProps
}) {
	if (!tags || !tags.length) {
		return null
	}
	const trimmmedTags = _.invokeMap(tags || [], 'replace', hashTagRegExp, '')
	const filteredTags = _.without(trimmmedTags, ...(blacklist || []))
	const uniqueTags = _.uniq(filteredTags)
	if (!uniqueTags.length) {
		return null
	}
	return (
		<Flex alignItems="center" flexWrap="wrap" {...restProps}>
			{uniqueTags.map((tag) => { return <Tag mr={2} mb={1} key={tag} {...tagProps}>{tag}</Tag> })}
		</Flex>
	)
}
