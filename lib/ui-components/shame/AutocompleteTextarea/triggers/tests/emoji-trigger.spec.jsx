/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import emojiTrigger from '../emoji-trigger'

ava('The emojiTrigger matches the search term to the correct emoji', async (test) => {
	const {
		dataProvider
	} = emojiTrigger()

	const [ emoji ] = dataProvider('pear')
	test.deepEqual(emoji, {
		key: 'pear',
		emoji: '🍐'
	})
})

ava('The emojiTrigger outputs the emoji correctly', async (test) => {
	const {
		dataProvider,
		output
	} = emojiTrigger()

	const [ emoji ] = dataProvider('pear')
	const result = output(emoji)

	test.is(result, '🍐')
})
