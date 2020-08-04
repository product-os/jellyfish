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
	useSetup
} from '@balena/jellyfish-ui-components/lib/SetupProvider'
import {
	streamContext
} from '../components/StreamProviderTask'
import {
	SET_CARDS
} from '../store/action-types'
import {
	selectCardById
} from '../store/selectors'
import {
	useTask
} from './use-task'

const useSetupStreamFactory = () => {
	const {
		sdk
	} = useSetup()
	const store = useStore()

	return React.useCallback(async () => {
		const stream = await sdk.stream({
			type: 'object',
			properties: {
				type: {
					type: 'string',
					enum: [
						'message@1.0.0',
						'support-thread@1.0.0'
					]
				}
			},
			required: [ 'type' ]
		})

		stream.on('update', ({
			data, error
		}) => {
			if (error) {
				console.error(error)
				return
			}

			// Ignore event that is neither insert nor update
			const typeBase = data.type.split('@')[0]
			if (typeBase !== 'insert' && typeBase !== 'update') {
				return
			}

			const card = data.after

			if (!card) {
				return
			}

			const state = store.getState()

			if (card.type.split('@')[0] === 'support-thread') {
				// Only accept a thread with correct product type
				if (card.data.product === state.product) {
					store.dispatch({
						type: SET_CARDS,
						payload: [ card ]
					})
				}
			} else if (card.type.split('@')[0] === 'message') {
				// Accept a message only if it's corresponding thread is found in state
				const thread = selectCardById(card.data.target)(state)

				if (thread) {
					store.dispatch({
						type: SET_CARDS,
						payload: [ card ]
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
