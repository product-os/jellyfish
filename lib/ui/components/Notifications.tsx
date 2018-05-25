import * as React from 'react';
import {
	Alert,
	Box,
	Fixed,
} from 'rendition';
import styled from 'styled-components';
import { connectComponent, ConnectedComponentProps } from '../services/helpers';

const MessageText = styled.span`
	white-space: pre;
`;

interface JellyfishAlertProps {
	type: string;
	id: string;
	message: string;
	onDismiss: (id: string) => void;
}

class JellyFishAlert extends React.Component<JellyfishAlertProps, {}> {
	public dismiss = () => {
		this.props.onDismiss(this.props.id);
	}

	render() {
		const { id, type, message } = this.props;
		return (
			<Alert
				key={id}
				mb={2}
				success={type === 'success'}
				danger={type === 'danger'}
				warning={type === 'warning'}
				info={type === 'info'}
				data-id={id}
				onDismiss={this.dismiss}
			>
				<MessageText>{message}</MessageText>
			</Alert>
		);
	}
}

interface NotificationsProps extends ConnectedComponentProps {}

class Base extends React.Component<NotificationsProps, {}> {
	public remove = (id: string) => {
		this.props.actions.removeNotification(id);
	}

	public render() {
		if (!this.props.appState.notifications.length) {
			return null;
		}

		return (
			<Fixed top={true} left={true} right={true}>
				<Box m={3} style={{opacity: 0.95}}>
					{this.props.appState.notifications.map(({type, id, message}) => {
						return (
							<JellyFishAlert
								key={id}
								id={id}
								type={type}
								message={message}
								onDismiss={this.remove}
							/>
						);
					})}
				</Box>
			</Fixed>
		);
	}
}

export const Notifications = connectComponent(Base);

