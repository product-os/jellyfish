import * as React from 'react';
import styled from 'styled-components';
import { StoreProvider } from '../components/StoreProvider/StoreProvider';
import { KeyPressListener } from './KeyPressListener/KeyPressListener';
import { Spinner } from './Spinner/Spinner';
import { SupportChat } from './SupportChat/SupportChat';

const LazySupportChat = React.lazy(async () => {
	return new Promise<{ default: typeof SupportChat }>(resolve => {
		require.ensure(
			[],
			require =>
				resolve({
					default: require<{
						SupportChat: typeof SupportChat;
					}>('./SupportChat/SupportChat').SupportChat,
				}),
			'support-chat',
		);
	});
});

export const SidebarSupportChatContainer = styled.div`
	background-color: white;
	color: #000;
	width: 376px;
	min-height: 250px;
	max-height: 620px;
	box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
	overflow: hidden;
	border-radius: 8px;
	height: calc(100% - 20px);
	position: absolute;
	bottom: 10px;
	left: 10px;
	display: flex;
	flex-direction: column;
	z-index: 2147483000;
`;

export interface SidebarSupportChatProps {
	token: string;
	apiUrl: string;
}

export const SidebarSupportChat = ({
	token,
	apiUrl,
}: SidebarSupportChatProps) => {
	const [isVisible, setVisibility] = React.useState(false);

	const handleKeyPress = React.useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'g' && e.ctrlKey) {
				setVisibility(!isVisible);
			}
		},
		[isVisible],
	);

	return (
		<KeyPressListener onKeyPress={handleKeyPress}>
			<StoreProvider token={token} apiUrl={apiUrl}>
				{isVisible && (
					<SidebarSupportChatContainer>
						<React.Suspense fallback={<Spinner flex="1" />}>
							<LazySupportChat flex="1" />
						</React.Suspense>
					</SidebarSupportChatContainer>
				)}
			</StoreProvider>
		</KeyPressListener>
	);
};
