/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Provider
} from 'rendition'
import {
	lightTheme
} from '../../themes'

export default function ThemeProvider ({
	uiTheme,
	children
}) {
	const theme = {
		colors: (uiTheme || lightTheme).data
	}
	console.log('theme', theme)
	return (
		<Provider
			theme={theme}
			style={{
				height: '100%',
				fontSize: 14
			}}
		>
			{children}
		</Provider>
	)
}
