/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	useStore
} from 'react-redux'
import {
	streamContext
} from '../components/StreamProviderTask'
import {
	SET_CARDS
} from '../store/actionTypes'
import {
	selectCardById
} from '../store/selectors'
import {
	useSdk,
	useTask
} from '.'

const useSetupStreamFactory = () => {
	const sdk = useSdk()
	const store = useStore()

	return React.useCallback(async () => {
		const stream = await sdk.stream({
			type: 'object',
			additionalProperties: true
		})

		stream.on('update', ({
			data, error
		}) => {
			if (error) {
				console.error(error)
				return
			}

			// Ignore event that is neither insert nor update
			if (data.type !== 'insert' && data.type !== 'update') {
				return
			}

			const state = store.getState()

			if (data.after.type === 'support-thread') {
				// Only accept a thread with correct product type
				if (data.after.data.product === state.product) {
					store.dispatch({
						type: SET_CARDS,
						payload: [ data.after ]
					})
				}
			} else if (data.after.type === 'message') {
				// Accept a message only if it's corresponding thread is found in state
				const thread = selectCardById(data.after.data.target)(state)

				if (thread) {
					store.dispatch({
						type: SET_CARDS,
						payload: [ data.after ]
					})
				}
			}
		})

		return stream
	}, [ sdk, store ])
}

export const useSetupStreamTask = () => {
	return useTask(useSetupStreamFactory())
}

export const useStream = () => {
	return React.useContext(streamContext)
}
