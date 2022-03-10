import React from 'react';
import { Box, Img } from 'rendition';
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

export default class ErrorBoundary extends React.Component<any, any> {
	constructor(props: any) {
		super(props);

		this.state = {
			error: false,
		};
	}

	static getDerivedStateFromError(error: any) {
		return {
			error,
		};
	}

	componentDidCatch(error: any, info: any) {
		const { errorReporter } = this.props;

		console.error('Caught error in boundary', {
			info,
			error,
		});

		if (errorReporter) {
			errorReporter.reportException(error, info);
		}
	}

	getDefaultErrorElement() {
		return (
			<IconWrapper style={this.props.style}>
				<h1>Oh no, Something went wrong!</h1>
				<Img src="/icons/dead-jellyfish.svg" />
			</IconWrapper>
		);
	}

	render() {
		const { getErrorElement, children } = this.props;

		const { error } = this.state;

		if (error) {
			return getErrorElement
				? getErrorElement(error)
				: this.getDefaultErrorElement();
		}

		return children;
	}
}
