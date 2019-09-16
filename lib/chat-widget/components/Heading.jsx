/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Txt
} from 'rendition'

export const Heading = ({
	primaryText, secondaryText, ...rest
}) => {
	return (
		<Txt mb="40px" align="center" {...rest}>
			<Txt mt="12px" mb="14px" fontSize="34px">
				{primaryText}
			</Txt>
			<Txt fontSize="13px">{secondaryText}</Txt>
		</Txt>
	)
}
