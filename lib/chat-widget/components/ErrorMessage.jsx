import React from 'react'
import {
	Txt
} from 'rendition'
import {
	useTheme
} from '../hooks'

export const ErrorMessage = ({
	error, ...rest
}) => {
	const theme = useTheme()

	return (
		<Txt.span color={theme.colors.danger.main} {...rest}>{error.message}</Txt.span>
	)
}
