/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
import ava from 'ava'
import {
	getQueue
} from './async-dispatch-queue'
import bluebird from 'bluebird'

const asyncDispatchQueue = getQueue()

ava(
	'asyncDispatchQueue: return streams should be in same order as input streams',
	async (test) => {
		const results = await new Promise((resolve, reject) => {
			const actionCreators = [ 3, 2, 1 ].map(async (num) => {
				await bluebird.delay(num * 100)
				return num
			})

			const dispatches = []

			const dispatch = (action) => {
				dispatches.push(action)

				if (dispatches.length === actionCreators.length) {
					resolve(dispatches)
				}
			}

			actionCreators.forEach((actionCreator) => {
				asyncDispatchQueue.enqueue(actionCreator, dispatch)
			})
		})

		test.deepEqual(results, [ 3, 2, 1 ])
	}
)
