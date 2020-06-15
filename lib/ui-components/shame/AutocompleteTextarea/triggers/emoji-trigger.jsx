/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import emoji from 'node-emoji'
import {
	Flex,
	Txt
} from 'rendition'

const EmojiItem = ({
	entity
}) => {
	return (
		<Flex
			style={{
				minWidth: 160
			}}
		>
			<Txt mr={3}>{entity.emoji}</Txt>
			<Txt>:{entity.key}:</Txt>
		</Flex>
	)
}

const emojiTrigger = () => {
	return {
		dataProvider: (token) => {
			if (!token) {
				return []
			}
			return emoji.search(token).slice(0, 10)
		},
		component: EmojiItem,
		output: (item) => { return item.emoji }
	}
}

export default emojiTrigger
