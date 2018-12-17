import { circularDeepEqual } from 'fast-equals';
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
import { Card } from '../../types';
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
		color: #333;
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
	setDefault?: typeof actionCreators['setDefault'];
}

interface ConnectedProps {
	types: Card[];
	subscription: null | Card;
	saveSubscription: typeof actionCreators['saveSubscription'];
	setDefault: typeof actionCreators['setDefault'];
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

	public setDefault = () => {
		this.props.setDefault(this.props.card);
	}

	public getNotificationSettings(): { [k: string]: any } {
		return _.get(this.props.subscription, 'data.notificationSettings') || {};
	}

	public shouldComponentUpdate(nextProps: ViewLinkProps, nextState: ViewLinkState): boolean {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props);
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
					bg={(isActive && !activeSlice) ? '#eee' : 'none'}
				>
					<Link
						className={`home-channel__item home-channel__item--${card.slug}`}
						style={{display: 'block', flex: '1'}}
						key={card.id}
						py={2}
						px={3}
						color={isActive && !activeSlice ? '#333' : undefined}
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
								style={{ display: 'block' }}
								mb={2}
								plaintext
								onClick={this.toggleSettings}
							>
								Settings
							</Button>
							<Button
								style={{ display: 'block' }}
								plaintext
								tooltip="Set this view as the default page when logging in"
								onClick={this.setDefault}
							>
								Set as default
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
													style={{background: (isActiveSlice) ? '#eee' : 'none'}}
												>
													<Link
														style={{display: 'block'}}
														py={2}
														pr={3}
														pl={4}
														color={isActiveSlice ? '#333' : undefined}
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
	setDefault: actionCreators.setDefault,
}, dispatch);

export const ViewLink: React.ComponentClass<ViewLinkProps> = connect(mapStateToProps, mapDispatchToProps)(ViewLinkBase as any);
