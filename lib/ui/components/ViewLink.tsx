import * as _ from 'lodash';
import * as React from 'react';
import { connect, Dispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Button,
	Flex,
	Link,
} from 'rendition';
import styled from 'styled-components';
import { Card } from '../../Types';
import { actionCreators, selectors, StoreState } from '../core/store';
import { ContextMenu } from './ContextMenu';
import Icon from './Icon';
import { NotificationsModal } from './NotificationsModal';

const EllipsisButton = styled(Button)`
	float: right;
	color: #c3c3c3;

	&:hover,
	&:focus {
		color: white;
	}
`;

interface ViewLinkProps {
	card: Card;
	isActive: boolean;
	update?: {
		id: string;
		newMentions?: boolean;
		newContent?: boolean;
	};
	open: (card: Card) => void;
	subscription?: null | Card;
	saveSubscription?: typeof actionCreators['saveSubscription'];
}

interface ConnectedProps {
	subscription: null | Card;
	saveSubscription: typeof actionCreators['saveSubscription'];
}

interface ViewLinkState {
	showMenu: boolean;
	showSettings: boolean;
}

class ViewLinkBase extends React.Component<ViewLinkProps & ConnectedProps, ViewLinkState> {
	constructor(props: ViewLinkProps & ConnectedProps) {
		super(props);

		this.state = {
			showMenu: false,
			showSettings: false,
		};
	}

	public open = () => {
		this.props.open(this.props.card);
	}

	public toggleMenu = () => {
		this.setState({ showMenu: !this.state.showMenu });
	}

	public toggleSettings = () => {
		this.setState({ showSettings: !this.state.showSettings });
	}

	public getNotificationSettings(): { [k: string]: any } {
		return _.get(this.props.subscription, 'data.notificationSettings') || {};
	}

	public saveNotificationSettings = (settings: any) => {
		const { subscription } = this.props;

		if (!subscription) {
			return;
		}

		subscription.data.notificationSettings = settings;

		this.props.saveSubscription(subscription, this.props.card.id);

		this.setState({
			showSettings: false,
		});
	}

	render(): React.ReactNode {
		const { card, isActive, update } = this.props;
		return (
			<Flex
				bg={isActive ? '#666' : 'none'}
				justify="space-between"
			>
				<Link
					className={`home-channel__item home-channel__item--${card.slug}`}
					style={{display: 'block', flex: '1'}}
					key={card.id}
					py={2}
					px={3}
					color={isActive ? 'white' : '#c3c3c3'}
					onClick={this.open}
				>
					{card.name}

					{!isActive && !!update &&
							<Icon
								name="circle"
								style={{
									color: update.newContent ? 'green' : 'orange',
									marginTop: 4,
									float: 'right',
									fontSize: 11,
								}}
							/>
					}
				</Link>

				{isActive &&
					<EllipsisButton
						px={3}
						plaintext
						onClick={this.toggleMenu}
					>
						<Icon name="ellipsis-v" />
					</EllipsisButton>
				}

				{this.state.showMenu &&
					<ContextMenu onClose={this.toggleMenu}>
						<Button
							plaintext
							onClick={this.toggleSettings}
						>
							Settings
						</Button>
					</ContextMenu>
				}

				<NotificationsModal
					show={this.state.showSettings}
					settings={this.getNotificationSettings()}
					onCancel={this.toggleSettings}
					onDone={this.saveNotificationSettings}
				/>
			</Flex>
		);
	}
}

const mapStateToProps = (state: StoreState, ownProps: ViewLinkProps) => ({
	subscription: selectors.getSubscription(state, ownProps.card.id),
});

const mapDispatchToProps = (dispatch: Dispatch<StoreState>) => bindActionCreators({
	saveSubscription: actionCreators.saveSubscription,
}, dispatch);

export const ViewLink: React.ComponentClass<ViewLinkProps> = connect(mapStateToProps, mapDispatchToProps)(ViewLinkBase);
