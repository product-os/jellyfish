import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Alert,
	Box,
	Fixed,
} from 'rendition';
import { JellyfishState } from '../../Types';
import { actionCreators } from '../services/store';

interface NotificationsProps {
	actions: typeof actionCreators;
	notifications: JellyfishState['notifications'];
}

class Notifications extends React.Component<NotificationsProps, {}> {
	public render() {
		if (!this.props.notifications.length) {
			return null;
		}

		return (
			<Fixed top left right>
				<Box m={3} style={{opacity: 0.95}}>
					{this.props.notifications.map(({type, id, message}) => {
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
								{message}
							</Alert>
						);
					})}
				</Box>
			</Fixed>
		);
	}
}

const mapStateToProps = (state: JellyfishState) => ({
	notifications: state.notifications,
});

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(Notifications);

