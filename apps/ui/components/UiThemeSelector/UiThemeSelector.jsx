/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import styled from 'styled-components'
import {
	Flex,
	Box,
	Txt
} from 'rendition'
import AutoCompleteCardSelect from '../AutoCompleteCardSelect'

const ScreenshotBox = styled(Box) `
	background: url(${(props) => props.backgroundUrl});
	background-repeat: no-repeat;
	background-size: cover;
	background-color: ${(props) => props.theme.colors.gray.main};
`

const toUiThemeValue = (theme) => {
	return theme ? {
		value: theme.id,
		title: theme.name,
		description: theme.data.description,
		firstScreenshotUrl: _.get(theme, [ 'data', 'screenshots', 0, 'url' ])
	} : null
}

const formatUiThemeOption = (option) => {
	return (
		<Flex p={2} flexDirection="row" maxWidth={400}>
			<ScreenshotBox height="50px" width="80px" mr={2} backgroundUrl={option.firstScreenshotUrl} />
			<Flex flexDirection="column">
				<Txt bold>{option.title}</Txt>
				{ option.description && <Txt fontSize="80%" italic>{option.description}</Txt>}
			</Flex>
		</Flex>
	)
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
			styles={{
				option: (base) => {
					return {
						...base,
						padding: 0
					}
				},
				valueContainer: (base) => {
					return {
						...base,
						minHeight: '66px'
					}
				}
			}}
			value={toUiThemeValue(selectedUiTheme)}
			isClearable={false}
			cardType="ui-theme"
			types={types}
			onChange={onSelectedUiThemeChange}
			getOption={toUiThemeValue}
			formatOptionLabel={formatUiThemeOption}
		/>
	)
}
