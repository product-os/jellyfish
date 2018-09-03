import * as React from 'react';
import styled from 'styled-components';
import { sdk } from '../core';

const ResponsiveImg = styled.img`
	height: auto;
	max-width: 100%;
`;

interface AuthenticatedImageProps {
	cardId: string;
	fileName: string;
}

interface AuthenticatedImageState {
	imageSrc: null | string;
}

export class AuthenticatedImage extends React.Component<
	AuthenticatedImageProps,
	AuthenticatedImageState
> {
	constructor(props: AuthenticatedImageProps) {
		super(props);

		this.state = {
			imageSrc: null,
		};
	}

	componentDidMount(): void {
		sdk.getFile(this.props.cardId, this.props.fileName)
		.then((data) => {
			const blob = new Blob([data]);

			this.setState({
				imageSrc: URL.createObjectURL(blob),
			});
		});
	}

	render(): React.ReactNode {
		const { imageSrc } = this.state;
		if (!imageSrc) {
			return null;
		}

		return <ResponsiveImg src={imageSrc} />;
	}
}
