import React from 'react'
import {
	useStore
} from 'react-redux'
import {
	streamContext
} from '../components/StreamProvider'
import {
	SET_CARDS
} from '../store/actionTypes'
import {
	useSdk,
	useTask
} from '.'

const useGetStreamPromise = () => {
	const sdk = useSdk()

	return React.useCallback(async () => {
		return sdk.stream({
			type: 'object',
			additionalProperties: true
		})
	}, [ sdk ])
}

export const useSetupStreamTask = () => {
	return useTask(useGetStreamPromise())
}

export const useStream = () => {
	const store = useStore()
	const stream = React.useContext(streamContext)

	stream.on('update', ({
		data, error
	}) => {
		if (error) {
			return
		}

		if (data.type === 'insert' || data.type === 'update') {
			if (data.after.type === 'message') {
				store.dispatch({
					type: SET_CARDS,
					payload: [ data.after ]
				})
			}
		}
	})

	return stream
}
