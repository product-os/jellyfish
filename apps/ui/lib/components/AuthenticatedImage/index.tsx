import React from 'react';
import styled from 'styled-components';
import { Markdown } from 'rendition/dist/extra/Markdown';
import { withSetup, Setup } from '../SetupProvider';
import Collapsible from '../Collapsible';
import Icon from '../shame/Icon';

const ResponsiveImg = styled.img<{ maxImageSize: number }>(
	({ maxImageSize }) => {
		return {
			maxWidth: `min(${maxImageSize}, 100%)`,
			maxHeight: maxImageSize,
			borderRadius: '6px',
			borderTopLeftRadius: 0,
			display: 'block',
		};
	},
);

interface AuthenticatedImageProps extends Setup {
	cardId: string;
	fileName: string;
	mimeType: string;
	maxImageSize: number;
	'data-test': string;
}

interface AuthenticatedImageState {
	imageSrc: string | null;
	error: string | null;
}

class AuthenticatedImage extends React.Component<
	AuthenticatedImageProps,
	AuthenticatedImageState
> {
	constructor(props: AuthenticatedImageProps) {
		super(props);
		this.state = {
			imageSrc: null,
			error: null,
		};
	}

	componentDidMount() {
		const { sdk, cardId, fileName, mimeType } = this.props;
		sdk
			.getFile(cardId as any, fileName)
			.then((data: any) => {
				const blob = new Blob([data], {
					type: mimeType,
				});
				this.setState({
					imageSrc: URL.createObjectURL(blob),
				});
			})
			.catch((error: Error | string) => {
				this.setState({
					error: typeof error === 'string' ? error : error.message,
				});
			});
	}

	render() {
		const { imageSrc, error } = this.state;
		const { maxImageSize } = this.props;

		if (error) {
			const detail = `\`\`\`\n${error}\n\`\`\``;
			return (
				<div>
					<span data-test={this.props['data-test']}>
						<em>An error occurred whilst loading image</em>
					</span>
					<Collapsible title="Details" maxContentHeight="70vh" flex={1}>
						{/*@ts-ignore*/}
						<Markdown>{detail}</Markdown>
					</Collapsible>
				</div>
			);
		}

		if (!imageSrc) {
			return <Icon name="cog" spin />;
		}

		return (
			<ResponsiveImg
				src={imageSrc}
				data-test={this.props['data-test']}
				maxImageSize={maxImageSize}
			/>
		);
	}
}

export default withSetup(AuthenticatedImage);
