/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'

const setupContext = React.createContext(null)

export const SetupProvider = ({
	environment, analytics, errorReporter, sdk, actions, children
}) => {
	const setup = React.useMemo(() => {
		return {
			environment,
			sdk,
			analytics,
			errorReporter,
			actions
		}
	}, [ environment, sdk, analytics, errorReporter, actions ])

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
