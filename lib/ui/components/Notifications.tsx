import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Alert,
	Box,
	Fixed,
} from 'rendition';
import styled from 'styled-components';
import { Notification } from '../../Types';
import { actionCreators, selectors, StoreState } from '../core/store';

const MessageText = styled.span`
	white-space: pre;
`;

interface JellyfishAlertProps {
	type: string;
	id: string;
	message: any;
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
				<MessageText>{_.isString(message) ? message : JSON.stringify(message)}</MessageText>
			</Alert>
		);
	}
}

interface NotificationsProps {
	notifications: Notification[];
	actions: typeof actionCreators;
}

class Base extends React.Component<NotificationsProps, {}> {
	public remove = (id: string) => {
		this.props.actions.removeNotification(id);
	}

	public render() {
		if (!this.props.notifications.length) {
			return null;
		}

		return (
			<Fixed top={true} left={true} right={true}>
				<Box m={3} style={{opacity: 0.95}}>
					{this.props.notifications.map(({type, id, message}) => {
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

const mapStateToProps = (state: StoreState) => {
	return {
		notifications: selectors.getNotifications(state),
	};
};

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export const Notifications = connect(mapStateToProps, mapDispatchToProps)(Base);

