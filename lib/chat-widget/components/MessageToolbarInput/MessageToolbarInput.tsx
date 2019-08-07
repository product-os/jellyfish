import * as React from 'react';
import SendMessageIcon = require('react-icons/lib/md/send');
import { Box, Button, Flex, FlexProps, ThemeType } from 'rendition';
import { ThemeProps, withTheme } from 'styled-components';
import { FileInput } from '../FileInput/FileInput';
import { NewMessage } from '../SupportChat/SupportChat';

interface MessageToolbarInputProps extends Omit<FlexProps, 'onChange'> {
	showSendMessageButton?: boolean;
	onMessageSend?: () => void;
	canSendMessage?: boolean;
	onChange: (message: NewMessage) => void;
	value: NewMessage;
}

class MessageToolbarInputBase extends React.Component<
	MessageToolbarInputProps & ThemeProps<ThemeType>
> {
	static defaultProps = {
		showSendMessageButton: true,
	};

	handleAttachFiles = (attachments: File[]) => {
		this.props.onChange({
			...this.props.value,
			attachments,
		});
	};

	render() {
		const {
			showSendMessageButton,
			onMessageSend,
			canSendMessage,
			onChange,
			value,
			theme,
			...rest
		} = this.props;

		return (
			<Flex {...rest} justifyContent="flex-end" p="10px 0">
				<Box>
					<FileInput onChange={this.handleAttachFiles} />
				</Box>

				{showSendMessageButton && (
					<Flex flex="1" justifyContent="flex-end">
						<Button
							data-test-id="send-message-button"
							onClick={onMessageSend}
							disabled={!canSendMessage}
							plain
							icon={
								<SendMessageIcon fill={theme.colors.info.main} size="20px" />
							}
						/>
					</Flex>
				)}
			</Flex>
		);
	}
}

export const MessageToolbarInput = withTheme(MessageToolbarInputBase);
