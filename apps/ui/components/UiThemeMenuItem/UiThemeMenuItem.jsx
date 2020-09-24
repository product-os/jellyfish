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
	lightTheme, darkTheme
} from '../../themes'

export default function UiThemeMenuItem ({
	user,
	actions: {
		setUiTheme
	},
	uiTheme
}) {
	const isDarkMode = _.get(uiTheme, [ 'name' ]) === 'Dark'
	const toggleUiTheme = () => {
		setUiTheme(isDarkMode ? lightTheme : darkTheme)
	}
	return (
		<Flex flexDirection="row" alignItems="center" justifyContent="space-between">
			<Txt>Dark Mode</Txt>
			<Checkbox
				toggle
				checked={isDarkMode}
				onChange={toggleUiTheme}
			/>
		</Flex>
	)
}
