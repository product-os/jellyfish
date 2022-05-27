import React from 'react';
import styled from 'styled-components';
import { Box, BoxProps } from 'rendition';
import useEventListener from '@use-it/event-listener';
import { useSelector } from 'react-redux';
import { selectors } from '../core';
import * as environment from '../environment';

const Container = styled(Box)`
	flex-direction: column;
	background-color: white;
	color: #000;
	min-height: 250px;
	max-height: 670px;
	box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
	overflow: hidden;
	border-radius: 8px;
	height: calc(100% - 20px);
	position: absolute;
	bottom: 10px;
	right: 10px;
	z-index: 15;
	display: none;

	&[data-visible='true'] {
		display: flex;
	}
`;

const LivechatFrameContainer = styled.iframe<{ loaded: boolean }>`
	width: 100%;
	height: 100%;
	border: 0;
	display: ${(props) => (props.loaded ? 'block' : 'none')};
`;

interface LivechatFrameProps extends BoxProps {
	product: string;
	productTitle: string;
	username: string;
	clientSlug?: string;
	onClose: () => void;
}

export const LivechatFrame: React.FunctionComponent<
	LivechatFrameProps & React.IframeHTMLAttributes<{}>
> = ({ product, productTitle, username, clientSlug, onClose, ...rest }) => {
	const [loaded, setLoaded] = React.useState(false);
	const frameRef = React.useRef<HTMLIFrameElement>(null);
	const livechatBaseUrl = environment.livechat.host;

	const handleMessage = React.useCallback(
		(event) => {
			if (event.origin !== livechatBaseUrl) {
				return;
			}

			switch (event.data.type) {
				case 'close':
					onClose();
					break;
			}
		},
		[onClose],
	);

	useEventListener('message', handleMessage, window);

	const handleLoad = React.useCallback(() => {
		setLoaded(true);
	}, []);

	const frameSrc = React.useMemo(() => {
		const url = new URL(`${livechatBaseUrl}/livechat`);
		url.searchParams.append('product', product);
		url.searchParams.append('productTitle', productTitle);
		url.searchParams.append('loginAs', username);
		url.searchParams.append('loginWithProvider', 'jellyfish');
		return url.href;
	}, [product, productTitle, username, clientSlug]);

	return (
		<Box {...rest}>
			{loaded ? null : 'Loading...'}
			<LivechatFrameContainer
				ref={frameRef}
				loaded={loaded}
				src={frameSrc}
				onLoad={handleLoad}
			/>
		</Box>
	);
};

const ChatWidgetSidebar = ({ onClose, isVisible }) => {
	const currentUser = useSelector(selectors.getCurrentUser);

	// Note! Don't render livechat if the page is open inside iframe,
	// because during oauth flow, jellyfish is open inside livechat iframe
	// which will cause infinite render.
	if (window.frameElement || window !== window.parent) {
		return null;
	}

	return (
		<Container
			data-test="chat-widget"
			data-visible={isVisible}
			width={['calc(100% - 20px)', 'calc(100% - 20px)', '376px']}
		>
			<LivechatFrame
				productTitle={'Jelly'}
				product={'jellyfish'}
				username={currentUser.slug.replace('user-', '')}
				onClose={onClose}
				style={{ height: '100%' }}
			/>
		</Container>
	);
};

export default ChatWidgetSidebar;
