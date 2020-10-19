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
	label, baseIcons
}) {
	// Sizes are proportional to the overall image size
	const baseFontSize = label && label.length > 2 ? 0.5 : 0.625
	const baseLineWidth = 0.125
	const labeledIcons = baseIcons.map(({
		size, src
	}) => {
		return {
			size,
			href: useLabeledImage(label, src, {
				width: size,
				height: size,
				fontSize: baseFontSize * size,
				lineWidth: baseLineWidth * size
			})
		}
	})

	return (
		<React.Fragment>
			<Helmet>
				{labeledIcons.map(({
					size, href
				}) => (
					<link key={size} rel="shortcut icon" href={href} type="image/x-icon" sizes={`${size}x${size}`} />
				))}
			</Helmet>
		</React.Fragment>
	)
}
