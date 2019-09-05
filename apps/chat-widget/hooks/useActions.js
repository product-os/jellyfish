/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	useStore
} from 'react-redux'
import * as actionCreators from '../store/actionCreators'
import {
	useSdk,
	useStream
} from '.'

export const useActions = () => {
	const store = useStore()
	const sdk = useSdk()
	const stream = useStream()

	return React.useMemo(() => {
		return Object.keys(actionCreators).reduce((actions, method) => {
			actions[method] = actionCreators[method]({
				store, sdk, stream
			})
			return actions
		}, {})
	}, [ store, sdk ])
}
