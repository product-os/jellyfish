/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Helmet
} from 'react-helmet'
import {
	useLabeledImage
} from '../../hooks'

export default function CountFavicon ({
	label, baseIcon
}) {
	const href = useLabeledImage(label, baseIcon, {
		fontSize: label && label.length > 2 ? 9 : 10
	})

	return (
		<Helmet>
			<link rel="shortcut icon" href={href} type="image/x-icon"/>
		</Helmet>
	)
}
