/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { ErrorInfo, ReactNode } from 'react';
import * as React from 'react';
import {
	Box,
	Img,
} from 'rendition';
import styled from 'styled-components';

const IconWrapper = styled(Box)`
	width: 100%;
	height: 100%;
	position: relative;

	img {
		top: 50%;
		left: 50%;
		position: absolute;
		width: 300px;
		margin-left: -150px;
		margin-top: -150px;
		animation: flap 2500ms infinite linear;
		transform: skew(15deg, -10deg);
	}

	h1 {
		text-align: center;
		position: absolute;
		top: 15%
		position: absolute;
		left: 0;
		right: 0;
		z-index: 1;
	}


	@keyframes flap {
		0% { transform: skew(15deg, -10deg); }
		25% { transform: skew(15deg, -15deg); }
		50% { transform: skew(15deg, -20deg); }
		75% { transform: skew(15deg, -15deg); }
	}
`;

interface WithChildren {
	children: ReactNode;
}

export class ErrorBoundary extends React.Component<WithChildren> {
	state = {
		hasError: false,
	};

	constructor(props: WithChildren) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(_error: Error): any {
		return { hasError: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error('Caught error in boundary', {
			info,
			error,
		});
		this.setState({ hasError: true });
	}

	render(): React.ReactNode {
		if (this.state.hasError) {
			return (
				<IconWrapper>
					<h1>Oh no, Something went wrong!</h1>
					<Img src="/icons/dead-jellyfish.svg" />
				</IconWrapper>
			);
		}

		return this.props.children;
	}
}
