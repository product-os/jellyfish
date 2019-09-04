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

			if (data.type === 'insert' || data.type === 'update') {
				if (data.after.type === 'message' || data.after.type === 'support-thread') {
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
