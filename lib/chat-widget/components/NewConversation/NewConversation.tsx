import * as React from 'react';
import { Box, Flex, FlexProps, Input } from 'rendition';
import * as uuid from 'uuid';
import { AttachmentList } from '../AttachmentList/AttachmentList';
import { Heading } from '../Heading/Heading';
import { MessageTextInput } from '../MessageTextInput/MessageTextInput';
import { MessageToolbarInput } from '../MessageToolbarInput/MessageToolbarInput';
import { StartConversationButton } from '../StartConversationButton/StartConversationButton';
import { NewMessage } from '../SupportChat/SupportChat';

interface NewConversationProps extends FlexProps {
	onMessageSend: (message: NewMessage) => void;
}

interface NewConversationState {
	message: NewMessage;
}

export class NewConversation extends React.Component<
	NewConversationProps,
	NewConversationState
> {
	state = {
		message: {
			id: uuid.v4(),
			text: '',
			subject: '',
			attachments: [],
		},
	};

	handleMessageChange = (message: NewMessage) => {
		this.setState({
			message,
		});
	};

	handleStartConversationButtonClick = () => {
		const { message } = this.state;

		if (message.text || message.attachments.length) {
			this.props.onMessageSend({
				...message,
				subject:
					message.subject ||
					(message.text.length > 40
						? message.text.substring(0, 40) + '...'
						: message.text),
			});
		}
	};

	handleAttachmentsChange = (attachments: File[]) => {
		this.setState(({ message }) => ({
			message: {
				...message,
				attachments,
			},
		}));
	};

	render() {
		const { message } = this.state;
		const { onMessageSend, ...rest } = this.props;

		return (
			<Flex {...rest} flexDirection="column" justifyContent="center" p="20px">
				<Heading
					primaryText="Welcome"
					secondaryText="Our team will reply to your questions & solve your problems in realtime as soon as possible."
				/>
				<Box>
					<Input
						type="text"
						placeholder="Title"
						value={message.subject}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							this.handleMessageChange({
								...message,
								subject: e.target.value,
							})
						}
						width="100%"
					/>
				</Box>
				<Box mt={2}>
					<MessageTextInput
						value={message}
						onChange={this.handleMessageChange}
					/>
					<AttachmentList
						mt={1}
						value={message.attachments}
						canDelete
						onChange={this.handleAttachmentsChange}
					/>
					<MessageToolbarInput
						showSendMessageButton={false}
						value={message}
						onChange={this.handleMessageChange}
					/>
				</Box>
				<Box m="20px 44px 0">
					<StartConversationButton
						onClick={this.handleStartConversationButtonClick}
					>
						Start conversation
					</StartConversationButton>
				</Box>
			</Flex>
		);
	}
}
