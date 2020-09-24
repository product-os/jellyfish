/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Box,
	Img
} from 'rendition'
import styled from 'styled-components'
import {
	px
} from '@balena/jellyfish-ui-components/lib/services/helpers'

const SplashWrapper = styled(Box) `
	width: 100%;
	height: 100%;
	background: ${(props) => { return props.theme.colors.background.main }};
	position: relative;
	overflow: hidden;
	transform: translate3d(0, 0, 0);

	.splash__wave {
		opacity: .4;
		position: absolute;
		top: 50%;
		left: 50%;
		background:  ${(props) => { return props.theme.colors.primary.dark }};
		transform-origin: 50% 48%;
		border-radius: 43%;
		animation: drift 3000ms infinite linear;
	}

	.splash__wave.-three {
		animation: drift 5000ms infinite linear;
	}

	.splash__wave.-two {
		animation: drift 7000ms infinite linear;
		opacity: .1;
		background: ${(props) => { return props.theme.colors.secondary.dark }};
	}

	.splash__icon {
		top: 50%;
		left: 50%;
		position: absolute;
		width: 100px;
		margin-left: -50px;
		margin-top: -50px;
		animation: wiggle 2500ms infinite linear;
	}

	&:before {
		content: '';
		display: block;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		background: ${(props) => {
		const color1 = `${props.theme.colors.secondary.dark}30`
		const color2 = `${props.theme.colors.tertiary.dark}30`
		const color3 = `${props.theme.colors.quartenary.dark}30`

		return `linear-gradient(180deg, ${color1} 0%, ${color2} 50%, ${color3} 100%);`
	}};
		z-index: 11;
		transform: translate3d(0, 0, 0);
	}

	@keyframes drift {
		from { transform: rotate(0deg); }
		from { transform: rotate(360deg); }
	}

	@keyframes wiggle {
		0% { transform: rotate(0deg); }
		25% { transform: rotate(15deg); }
		50% { transform: rotate(0deg); }
		75% { transform: rotate(-15deg); }
	}
`

const sizes = [ 240, 500 ]
const dim = [ px(sizes[0]), px(sizes[0]), px(sizes[1]) ]
const margin = [ px(-sizes[0] / 2), px(-sizes[0] / 2), px(-sizes[1] / 2) ]
const splashWaveStyles = {
	width: dim,
	height: dim,
	ml: margin,
	mt: margin
}

export default function Splash (props) {
	return (
		<SplashWrapper className="splash" {...props}>
			<Box {...splashWaveStyles} className="splash__wave -one"/>
			<Box {...splashWaveStyles} className="splash__wave -two"/>
			<Box {...splashWaveStyles} className="splash__wave -three"/>
			<Img className="splash__icon" src="/icons/jellyfish.svg"/>
		</SplashWrapper>
	)
}
