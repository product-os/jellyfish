/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Alert
} from 'rendition'

export const ErrorMessage = ({
	children, ...rest
}) => {
	return (
		<Alert plaintext danger {...rest}>{children}</Alert>
	)
}
