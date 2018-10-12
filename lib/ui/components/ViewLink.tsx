import * as _ from 'lodash';
import * as React from 'react';
import { connect, Dispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Button,
	Flex,
	Link,
} from 'rendition';
import styled from 'styled-components';
import { Card } from '../../Types';
import { actionCreators, selectors, StoreState } from '../core/store';
import { getViewSlices } from '../services/helpers';
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
	activeSlice: any;
	update?: {
		id: string;
		newMentions?: boolean;
		newContent?: boolean;
	};
	open: (card: Card, options?: any) => void;
	subscription?: null | Card;
	saveSubscription?: typeof actionCreators['saveSubscription'];
}

interface ConnectedProps {
	types: Card[];
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

	public open = (options?: any) => {
		this.props.open(this.props.card, options);
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
		const {
			activeSlice,
			card,
			isActive,
			types,
			update,
		} = this.props;

		const slices = isActive ? getViewSlices(card, types) : null;

		return (
			<Box>
				<Flex
					justify="space-between"
					bg={(isActive && !activeSlice) ? '#666' : 'none'}
				>
					<Link
						className={`home-channel__item home-channel__item--${card.slug}`}
						style={{display: 'block', flex: '1'}}
						key={card.id}
						py={2}
						px={3}
						color={isActive ? 'white' : '#c3c3c3'}
						onClick={() => this.open()}
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
					{isActive && !!slices && (
						<ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
							{_.map(slices, (slice: any) => {
								return (
									<React.Fragment key={slice.path}>
										{_.map(slice.values, (value) => {
											const isActiveSlice = activeSlice && (activeSlice.path === slice.path && activeSlice.value === value);
											return (
												<li
													key={value}
													style={{background: (isActiveSlice) ? '#666' : 'none'}}
												>
													<Link
														style={{display: 'block'}}
														py={2}
														pr={3}
														pl={4}
														color={isActiveSlice ? 'white' : '#c3c3c3'}
														onClick={() => this.open({
															slice: {
																title: slice.title,
																path: slice.path,
																value,
															},
														})}
													>
														{slice.title}: {value}
													</Link>
												</li>
											);
										})}
									</React.Fragment>
								);
							})}
						</ul>
					)}
			</Box>
		);
	}
}

const mapStateToProps = (state: StoreState, ownProps: ViewLinkProps) => ({
	subscription: selectors.getSubscription(state, ownProps.card.id),
	types: selectors.getTypes(state),
});

const mapDispatchToProps = (dispatch: Dispatch<StoreState>) => bindActionCreators({
	saveSubscription: actionCreators.saveSubscription,
}, dispatch);

export const ViewLink: React.ComponentClass<ViewLinkProps> = connect(mapStateToProps, mapDispatchToProps)(ViewLinkBase as any);
