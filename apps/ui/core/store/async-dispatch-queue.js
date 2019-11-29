/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as Bluebird from 'bluebird'

// Simple queue for dispatching actions that are generated asynchronously, in
// the same order that they are called.
// When enqueuing, the first argument should be a promise that returns
// an action, and the second argument should be the "dispatch" method of the
// redux store that is being operated on.
// The queue is periodically flushed, and all promises are processed
// simultaneously, but the resulting actions are dispatched in the order in
// which they are enqueued.
export const getQueue = (flushTimeout = 250) => {
	const queue = []

	const processQueue = async () => {
		const toProcess = []

		// Dequeue everything into a temporary array
		while (queue.length) {
			toProcess.push(queue.shift())
		}

		// Concurrently process all futures into an array of dispatchable actions
		const actionables = await Bluebird.map(toProcess, async (job) => {
			const [ future, dispatch ] = job

			const action = await future

			return [ action, dispatch ]
		})

		// Dispatch all the actions in order
		for (const element of actionables) {
			const [ action, dispatch ] = element
			if (action) {
				dispatch(action)
			}
		}

		// If the queue is empty after the processing has finished, wait
		if (!queue.length) {
			await Bluebird.delay(flushTimeout)
		}

		return processQueue()
	}

	processQueue()

	return {
		enqueue (future, dispatch) {
			queue.push([ future, dispatch ])
		}
	}
}
