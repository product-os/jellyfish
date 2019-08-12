import React from 'react'
import {
	useStore
} from 'react-redux'
import * as actionCreators from '../store/actionCreators'
import {
	useSdk
} from './useSdk'

export const useActions = () => {
	const store = useStore()
	const sdk = useSdk()

	return React.useMemo(() => {
		return Object.keys(actionCreators).reduce((actions, method) => {
			actions[method] = actionCreators[method](store, sdk)
			return actions
		}, {})
	}, [ store, sdk ])
}
