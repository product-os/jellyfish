/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import AutoCompleteCardSelect from '../AutoCompleteCardSelect'

const toUiThemeValue = (theme) => {
	return theme ? {
		value: theme.id,
		label: theme.name || theme.slug,
		type: 'ui-theme',
		shade: 1
	} : null
}

export default function UiThemeSelector ({
	user, types, uiTheme, actions
}) {
	const [ selectedUiTheme, setSelectedUiTheme ] = React.useState(uiTheme)

	const onSelectedUiThemeChange = React.useCallback((selectedTheme) => {
		setSelectedUiTheme(selectedTheme)
		actions.setUiTheme(selectedTheme)
	}, [ setSelectedUiTheme ])

	return (
		<AutoCompleteCardSelect
			value={toUiThemeValue(selectedUiTheme)}
			cardType="ui-theme"
			types={types}
			onChange={onSelectedUiThemeChange}
		/>
	)
}
