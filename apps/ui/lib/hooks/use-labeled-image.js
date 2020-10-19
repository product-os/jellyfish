/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable id-length */

import React from 'react'
import _ from 'lodash'

const canvasSupported = (() => {
	try {
		return typeof document !== 'undefined' && Boolean(document.createElement('canvas').getContext)
	} catch (error) {
		return false
	}
})()

const defaults = {
	width: 16,
	height: 16,
	fontSize: 10,
	color: '#000000',
	stroke: 'rgba(255,255,255,0.85)',
	align: 'right',
	valign: 'bottom',
	lineWidth: 2
}

const getCoords = (options) => {
	return {
		x: options.align.toLowerCase() === 'left' ? 0 : options.width - 2,
		y: options.valign.toLowerCase() === 'top' ? 0 : options.height + 2
	}
}

const drawLabel = (canvas, label, options) => {
	const context = canvas.getContext('2d')
	const coords = getCoords(options)
	context.font = `700 ${options.fontSize}px monospace`
	context.fillStyle = options.color
	context.textAlign = options.align
	context.textBaseline = options.valign
	context.strokeStyle = options.stroke
	context.lineWidth = options.lineWidth
	context.strokeText(label, coords.x, coords.y)
	context.fillText(label, coords.x, coords.y)
}

const imgToCanvas = (img) => {
	const canvas = document.createElement('canvas')
	canvas.width = img.width
	canvas.height = img.height
	const context = canvas.getContext('2d')
	context.drawImage(img, 0, 0)
	return canvas
}

export default function useLabeledImage (label, baseImage, options = {}) {
	const [ href, setHref ] = React.useState(baseImage)

	React.useEffect(() => {
		let unmounted = false

		if (!canvasSupported || !label) {
			setHref(baseImage)
			return _.noop
		}

		const mergedOptions = _.defaultsDeep(options, defaults, {
			src: baseImage
		})

		const img = document.createElement('img')
		img.src = mergedOptions.src
		img.width = mergedOptions.width
		img.height = mergedOptions.height
		img.crossOrigin = 'anonymous'
		img.onload = () => {
			const canvas = imgToCanvas(img)
			drawLabel(canvas, label, mergedOptions)
			try {
				if (!unmounted) {
					setHref(canvas.toDataURL('image/png'))
				}
			} catch (error) {
				setHref(baseImage)
			}
		}
		img.onerror = () => {
			setHref(baseImage)
		}
		return () => {
			unmounted = true
		}
	}, [ label, baseImage ])
	return href
}
