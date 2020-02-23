/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	bindActionCreators
} from 'redux'
import {
	useDispatch
} from 'react-redux'

const setupContext = React.createContext(null)

export const SetupProvider = ({
	analytics, sdk, actionCreators, children
}) => {
	const dispatch = useDispatch()

	const actions = bindActionCreators(actionCreators || [], dispatch)
	const setup = React.useMemo(() => {
		return {
			sdk,
			analytics,
			actions
		}
	}, [ sdk, analytics, actionCreators ])

	return (
		<setupContext.Provider value={setup}>{children}</setupContext.Provider>
	)
}

export const withSetup = (Component) => {
	return (props) => {
		return (
			<setupContext.Consumer>
				{(setup) => {
					return (
						<Component {...setup} {...props} />
					)
				}}
			</setupContext.Consumer>
		)
	}
}

export const useSetup = () => {
	return React.useContext(setupContext)
}
