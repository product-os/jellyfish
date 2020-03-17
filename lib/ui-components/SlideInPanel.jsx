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
	swallowEvent
} from './services/helpers'

const px = (val) => {
	return (typeof val === 'number' ? `${val}px` : val)
}

const SlideInWrapper = styled.div `
	position: absolute;
  overflow: hidden;
	top: 0;
	left: 0;
	height: 100%;
	width: 100%;
	visibility: hidden;
	transition: visibility 0s 0.6s;
	&.slide-in--open {
		visibility: visible;
		transition: visibility 0s 0s;
		&::after {
			background: ${(props) => { return props.theme.layer.overlay.background }};
			transition: background .3s 0s;
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
		transition: background .3s .3s;
	}
`

const SlideInPanelBase = styled(Flex) `
	position: absolute;
  background: ${(props) => { return props.theme.global.colors.white }};
  z-index: 1;
	transition: transform 0.3s 0.3s;
	.slide-in--open & {
		transform: translate3d(0, 0, 0);
  	transition-delay: 0s;
	}
`

const VerticalSlideInPanel = styled(SlideInPanelBase) `
	height: ${(props) => { return px(props.height) }};
	width: 100%;
`

const HorizontalSlideInPanel = styled(SlideInPanelBase) `
	width: ${(props) => { return px(props.width) }};
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
	children
}) {
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
				{children}
			</SlideInPanel>
		</SlideInWrapper>
	)
}
