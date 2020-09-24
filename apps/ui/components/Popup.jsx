/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import styled from 'styled-components'
import {
	px
} from '@balena/jellyfish-ui-components/lib/services/helpers'

// TODO: Use ${position} from 'styled-system' instead of explicitly setting top and left
const Wrapper = styled.div `
	position: absolute;
	z-index: 20;
	top: ${(props) => { return px(props.top) }};
	left: ${(props) => { return px(props.left) }};
`

export default function Popup ({
	isOpen, setIsOpen, children, ...props
}) {
	const popupRef = React.useRef()

	// Close the popup if the user clicks outside of it
	// TODO: Refactor useOnClickOutside to accept a React ref rather
	// than just a DOM ref and then use that hook here.
	React.useEffect(
		() => {
			const listener = (event) => {
				// Do nothing if clicking ref's element or descendent elements
				if (popupRef && popupRef.current && !popupRef.current.contains(event.target)) {
					setIsOpen(false)
				}
			}

			document.addEventListener('mousedown', listener)
			document.addEventListener('touchstart', listener)

			return () => {
				document.removeEventListener('mousedown', listener)
				document.removeEventListener('touchstart', listener)
			}
		},
		[ popupRef ]
	)

	return isOpen ? (
		<Wrapper ref={popupRef} {...props}>
			{children}
		</Wrapper>
	) : null
}
