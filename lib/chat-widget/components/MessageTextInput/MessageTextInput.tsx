import * as React from 'react';
import { Textarea } from 'rendition';
import { NewMessage } from '../SupportChat/SupportChat';

interface MessageTextInputProps {
	value: NewMessage;
	onChange: (value: NewMessage) => void;
	onKeyPress?: (event: React.KeyboardEvent<HTMLElement>) => void;
}

export class MessageTextInput extends React.Component<MessageTextInputProps> {
	shouldComponentUpdate(nextProps: MessageTextInputProps) {
		return nextProps.value.text !== this.props.value.text;
	}

	handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		this.props.onChange({
			...this.props.value,
			text: e.target.value,
		});
	};

	render() {
		const { value, onKeyPress } = this.props;

		return (
			<Textarea
				style={{ boxSizing: 'border-box' }}
				placeholder="Type a message..."
				spellCheck={false}
				value={value.text}
				onChange={this.handleChange}
				onKeyPress={onKeyPress}
			/>
		);
	}
}
