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
	useSdk
} from '.'

export const useActions = () => {
	const store = useStore()
	const sdk = useSdk()

	return React.useMemo(() => {
		return Object.keys(actionCreators).reduce((actions, method) => {
			actions[method] = actionCreators[method]({
				store, sdk
			})
			return actions
		}, {})
	}, [ store, sdk ])
}
