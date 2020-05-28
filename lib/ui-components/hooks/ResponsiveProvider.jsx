/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-undefined */

import React from 'react'
import {
	withTheme
} from 'styled-components'

const responsiveContext = React.createContext(null)

const ResponsiveProviderInner = ({
	theme,
	children
}) => {
	const isClient = typeof window === 'object'

	const getSize = () => {
		return {
			width: isClient ? window.innerWidth : undefined,
			height: isClient ? window.innerHeight : undefined
		}
	}

	const [ windowSize, setWindowSize ] = React.useState(getSize)

	React.useEffect(() => {
		if (!isClient) {
			return false
		}

		const handleResize = () => {
			setWindowSize(getSize())
		}

		window.addEventListener('resize', handleResize)
		return () => {
			return window.removeEventListener('resize', handleResize)
		}

		// Empty array ensures that effect is only run on mount and unmount
	}, [])

	const context = {
		windowSize,
		isMobile: windowSize.width < theme.breakpoints[1]
	}

	return <responsiveContext.Provider value={context}>{children}</responsiveContext.Provider>
}

export const ResponsiveProvider = withTheme(ResponsiveProviderInner)

export const withResponsiveContext = (Component) => {
	return (props) => {
		return (
			<responsiveContext.Consumer>
				{(context) => {
					return <Component {...context} {...props} />
				}}
			</responsiveContext.Consumer>
		)
	}
}

export const useResponsiveContext = () => {
	return React.useContext(responsiveContext)
}
