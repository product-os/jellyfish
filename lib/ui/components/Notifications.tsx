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

interface NotificationsProps extends ConnectedComponentProps {}

class Base extends React.Component<NotificationsProps, {}> {
	public render() {
		if (!this.props.appState.notifications.length) {
			return null;
		}

		return (
			<Fixed top left right>
				<Box m={3} style={{opacity: 0.95}}>
					{this.props.appState.notifications.map(({type, id, message}) => {
						return (
							<Alert
								key={id}
								mb={2}
								success={type === 'success'}
								danger={type === 'danger'}
								warning={type === 'warning'}
								info={type === 'info'}
								onDismiss={() => this.props.actions.removeNotification(id)}
							>
								<MessageText>{message}</MessageText>
							</Alert>
						);
					})}
				</Box>
			</Fixed>
		);
	}
}

export const Notifications = connectComponent(Base);

