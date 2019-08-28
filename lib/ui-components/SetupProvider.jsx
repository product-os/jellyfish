import React from 'react'

const setupContext = React.createContext(null)

export const SetupProvider = ({
	analytics, sdk, actions, children
}) => {
	const setup = React.useMemo(() => {
		return {
			sdk,
			analytics,
			actions
		}
	}, [ sdk, analytics, actions ])

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
