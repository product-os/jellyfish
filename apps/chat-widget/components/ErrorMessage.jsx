/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

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
