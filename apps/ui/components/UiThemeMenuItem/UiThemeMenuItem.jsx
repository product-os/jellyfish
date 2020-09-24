/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Flex,
	Txt,
	Checkbox
} from 'rendition'
import {
	sdk
} from '../../core'

// TODO: Avoid these hard-coded identifiers!
const LIGHT_THEME_SLUG = 'ui-theme-default-light'
const DARK_THEME_SLUG = 'ui-theme-default-dark'

const defaultThemesQuery = {
	type: 'object',
	properties: {
		type: {
			const: 'ui-theme@1.0.0'
		},
		active: {
			const: true
		},
		slug: {
			type: 'string',
			enum: [ LIGHT_THEME_SLUG, DARK_THEME_SLUG ]
		}
	}
}

export default function UiThemeMenuItem ({
	user,
	actions: {
		setUiTheme
	},
	uiTheme
}) {
	const [ lightTheme, setLightTheme ] = React.useState(null)
	const [ darkTheme, setDarkTheme ] = React.useState(null)

	const getDefaultThemes = async () => {
		const [ light, dark ] = await sdk.query(defaultThemesQuery, {
			sortBy: 'slug',
			sortDir: 'desc'
		})

		setLightTheme(light)
		setDarkTheme(dark)
	}

	React.useEffect(() => {
		getDefaultThemes()
	}, [])

	const isDarkMode = _.get(uiTheme, [ 'slug' ]) === DARK_THEME_SLUG

	const toggleUiTheme = () => {
		setUiTheme(isDarkMode ? lightTheme : darkTheme)
	}

	return (
		<Flex flexDirection="row" alignItems="center" justifyContent="space-between">
			<Txt>Dark Mode</Txt>
			<Checkbox
				toggle
				disabled={!lightTheme || !darkTheme}
				checked={isDarkMode}
				onChange={toggleUiTheme}
			/>
		</Flex>
	)
}
