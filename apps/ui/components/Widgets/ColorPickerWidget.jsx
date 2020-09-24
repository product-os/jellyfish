/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	SketchPicker
} from 'react-color'
import styled from 'styled-components'
import {
	Box
} from 'rendition'
import Popup from '../Popup'

const Wrapper = styled(Box) `
	position: relative;
`

const ColorBox = styled(Box) `
	border-radius: 4px;
	border: 1px solid;
	border-color: ${(props) => { return props.theme.colors.border || '#000' }};
`

const DEFAULT_SIZE = 24

export default function ColorPickerWidget ({
	value, options, onChange
}) {
	const size = options.size || DEFAULT_SIZE
	const [ isPickerOpen, setIsPickerOpen ] = React.useState(false)

	return (
		<Wrapper>
			<ColorBox
				tooltip={value}
				onClick={() => setIsPickerOpen(true)}
				width={size}
				height={size}
				bg={value}
			/>
			<Popup
				isOpen={isPickerOpen}
				setIsOpen={setIsPickerOpen}
				top={0}
				left={size + 4}
			>
				<SketchPicker
					disableAlpha
					color={value}
					onChange={(color) => onChange(color.hex)}
				/>
			</Popup>
		</Wrapper>
	)
}
