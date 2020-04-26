/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import styled from 'styled-components'
import {
	Flex
} from 'rendition'
import {
	px,
	swallowEvent
} from './services/helpers'
import ErrorBoundary from './shame/ErrorBoundary'

// Slide-in delay in seconds
const DELAY = 0.6

const SlideInWrapper = styled.div `
	position: absolute;
  overflow: hidden;
	top: 0;
	left: 0;
	height: 100%;
	width: 100%;
	visibility: hidden;
	transition: visibility 0s ${DELAY}s;
	&.slide-in--open {
		visibility: visible;
		transition: visibility 0s 0s;
		&::after {
			background: ${(props) => { return props.theme.layer.overlay.background }};
			transition: background ${DELAY / 2}s 0s;
		}
	}
	&::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: 0 0;
		cursor: pointer;
		transition: background ${DELAY / 2}s ${DELAY / 2}s;
	}
`

const SlideInPanelBase = styled(Flex) `
	position: absolute;
  background: ${(props) => { return props.theme.global.colors.white }};
  z-index: 1;
	transition: transform ${DELAY / 2}s ${DELAY / 2}s;
	.slide-in--open & {
		transform: translate3d(0, 0, 0);
  	transition-delay: 0s;
	}
`

const VerticalSlideInPanel = styled(SlideInPanelBase) `
	height: ${(props) => { return px(props.height) }};
	max-height: 100%;
	width: 100%;
`

const HorizontalSlideInPanel = styled(SlideInPanelBase) `
	width: ${(props) => { return px(props.width) }};
	max-width: 100%;
	height: 100%;
`

const Panels = {
	bottom: styled(VerticalSlideInPanel) `
		bottom: 0;
		transform: translate3d(0, 100%, 0);
	`,
	top: styled(VerticalSlideInPanel) `
		top: 0;
		transform: translate3d(0, -100%, 0);
	`,
	left: styled(HorizontalSlideInPanel) `
	  left: 0;
		transform: translate3d(-100%, 0, 0);
	`,
	right: styled(HorizontalSlideInPanel) `
	  right: 0;
		transform: translate3d(100%, 0, 0);
	`
}

export default function SlideIn ({
	className,
	from,
	isOpen,
	onClose,
	width,
	height,
	disableClickOutsideToClose,
	lazyLoadContent,
	children
}) {
	const [ isContentLoaded, setIsContentLoaded ] = React.useState(isOpen)

	React.useEffect(() => {
		if (isOpen) {
			// Load the panel's content as soon as we open the panel
			setIsContentLoaded(true)
		} else {
			// Unload the panel's content after the panel has fully slid out of view
			setTimeout(() => {
				return setIsContentLoaded(false)
			}, DELAY * 1000)
		}
	}, [ isOpen ])

	const SlideInPanel = Panels[from]
	if (typeof SlideInPanel === 'undefined') {
		throw new Error('SlideIn \'from\' prop must be one of: top | bottom | left | right')
	}
	return (
		<SlideInWrapper
			className={`slide-in--${isOpen ? 'open' : 'closed'}`}
			onClick={disableClickOutsideToClose ? null : onClose}
		>
			<SlideInPanel
				width={width}
				height={height}
				className={className}
				onClick={swallowEvent}
			>
				{(!lazyLoadContent || isContentLoaded) && <ErrorBoundary>{children}</ErrorBoundary>}
			</SlideInPanel>
		</SlideInWrapper>
	)
}
