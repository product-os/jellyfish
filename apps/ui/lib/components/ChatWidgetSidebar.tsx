import React from 'react';
import styled from 'styled-components';
import { Box } from 'rendition';
import { ChatWidget } from './ChatWidget';
import { ErrorBoundary } from '.';

const Container = styled(Box)`
	display: flex;
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
`;

interface Props {
	onClose: () => void;
}

const ChatWidgetSidebar = ({ onClose }: Props) => {
	return (
		<Container
			data-test="chat-widget"
			width={['calc(100% - 20px)', 'calc(100% - 20px)', '376px']}
		>
			<ErrorBoundary>
				<ChatWidget
					productTitle={'Jelly'}
					product={'jellyfish'}
					onClose={onClose}
				/>
			</ErrorBoundary>
		</Container>
	);
};

export default ChatWidgetSidebar;
