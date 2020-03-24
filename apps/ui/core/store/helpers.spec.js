/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const ava = require('ava')
const uuid = require('uuid').v4
const update = require('immutability-helper')
const {
	updateThreadChannels
} = require('./helpers')

const getMessageCard = (target) => {
	return {
		id: uuid(),
		data: {
			target
		}
	}
}

const getThreadChannel = (id, messages) => {
	return {
		data: {
			head: {
				id,
				links: {
					'has attached element': messages
				}
			}
		}
	}
}

ava('updateThreadChannels updates the corresponding channel', (test) => {
	// Setup:
	const messageT1a = getMessageCard('t1')
	const messageT1b = getMessageCard('t1')
	const messageT2a = getMessageCard('t2')
	const channel1 = getThreadChannel('t1', [ messageT1a, messageT1b ])
	const channel2 = getThreadChannel('t2', [ messageT2a ])
	const allChannels = [ channel1, channel2 ]
	const updatedMessageT1b = update(messageT1b, {
		data: {
			mirrors: {
				$set: [ 'www.google.com' ]
			}
		}
	})

	// Action:
	// - Update the second event in the first channel
	const updatedChannels = updateThreadChannels('t1', updatedMessageT1b, allChannels)

	// Verify
	// - Only channel 't1' is updated
	test.is(updatedChannels.length, 1)
	test.is(updatedChannels[0].data.head.id, 't1')

	// - the second event in the updated channel now has the mirrors field set
	const mirrors = updatedChannels[0].data.head.links['has attached element'][1].data.mirrors
	test.deepEqual(mirrors, [ 'www.google.com' ])
})
