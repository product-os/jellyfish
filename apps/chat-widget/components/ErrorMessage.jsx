import React from 'react'
import {
	Txt
} from 'rendition'

export const ErrorMessage = ({
	error, ...rest
}) => {
	return (
		<Txt.span color="colors.danger.main" {...rest}>{error.message}</Txt.span>
	)
}
