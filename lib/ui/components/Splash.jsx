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

const SplashWrapper = styled(Box) `
	width: 100%;
	height: 100%;
	background: lighten(#f0f4c3, 10%);
	position: relative;
	overflow: hidden;
	transform: translate3d(0, 0, 0);

	.splash__wave {
		opacity: .4;
		position: absolute;
		top: 50%;
		left: 50%;
		background: #0af;
		width: 500px;
		height: 500px;
		margin-left: -250px;
		margin-top: -250px;
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
		background: yellow;
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

	&:after {
		content: '';
		display: block;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(to bottom, rgba(#e8a, 1), rgba(#def, 0) 80%, rgba(white, .5));
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
export default function Splash (props) {
	return (
		<SplashWrapper className="splash" {...props}>
			<div className="splash__wave -one"/>
			<div className="splash__wave -two"/>
			<div className="splash__wave -three"/>
			<Img className="splash__icon" src="/icons/jellyfish.svg"/>
		</SplashWrapper>
	)
}
