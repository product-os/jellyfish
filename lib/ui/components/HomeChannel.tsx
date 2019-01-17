import { circularDeepEqual } from 'fast-equals';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Button,
	Divider,
	Fixed,
	Flex,
	Link,
	Modal,
	Txt,
} from 'rendition';
import { Markdown } from 'rendition/dist/extra/Markdown';
import styled from 'styled-components';
import { Card, Channel, RendererProps, ViewNotice } from '../../types';
import { actionCreators, selectors, StoreState } from '../core/store';
import { createChannel } from '../services/helpers';
import Gravatar from './Gravatar';
import Icon from './Icon';
import { TailStreamer } from './TailStreamer';
import { ViewLink } from './ViewLink';

// View slugs that should be displayed first
const PRIORITY_VIEWS = [
	'view-my-alerts',
	'view-my-mentions',
	'view-my-todo-items',
	'view-my-orgs',
];

const getDefaultView = (user: Card | null, views: Card[]): Card | null => {
	const homeViewId = _.get(user, [ 'data', 'profile', 'homeView' ]);
	if (homeViewId) {
		const homeView = _.find(views, { id: homeViewId });
		if (homeView) {
			return homeView;
		}
	}

	return _.find(views, { slug: 'view-all-messages' }) || null;
};

const MenuPanel = styled(Box)`
	position: absolute;
	top: 64px;
	width: 180px;
	background: white;
	box-shadow: 0 1px 4px rgba(17, 17, 17, 0.5);
	border-radius: 3px;

	&::before {
		content: '';
		width: 0;
		height: 0;
		border-left: 5px solid transparent;
		border-right: 5px solid transparent;
		border-bottom: 5px solid #ccc;
		position: absolute;
    top: -6px;
		left: 14px;
	}

	&::after {
		content: '';
		width: 0;
		height: 0;
		border-left: 5px solid transparent;
		border-right: 5px solid transparent;
		border-bottom: 5px solid white;
		position: absolute;
    top: -5px;
		left: 14px;
	}
`;

const UserMenuBtn = styled(Button)`
	background: transparent;
	color: #888;

	&:hover,
	&:focus,
	&:active {
		color: #333;
	}
`;

interface HomeChannelProps extends RendererProps {
	changelog: string | null;
	channels: Channel[];
	user: Card | null;
	version: string | null;
	codename: string | null;
	orgs: Card[];
	viewNotices: {
		[k: string]: ViewNotice;
	};
	uiState: any;
	actions: typeof actionCreators;
}

interface HomeChannelState {
	showChangelog: boolean;
	showMenu: boolean;
	tail: null | Card[];
	messages: Card[];
}

class HomeChannelBase extends TailStreamer<HomeChannelProps, HomeChannelState> {
	constructor(props: HomeChannelProps) {
		super(props);

		this.state = {
			showChangelog: false,
			showMenu: false,
			tail: null,
			messages: [],
		};

		this.streamTail(this.props.channel.data.target);
		if (this.props.channels.length > 1) {
			this.props.actions.setActiveView(this.props.channels[1].data.target);
		}
	}

	public shouldComponentUpdate(nextProps: HomeChannelProps, nextState: HomeChannelState): boolean {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props);
	}

	public setTail(tail: Card[]): void {
		tail.forEach(card => {
			this.props.actions.streamView(card);
		});
		// If there is only 1 channel, check for the home channel, otherwise, open
		// the all messages view by default
		if (this.props.channels.length === 1) {
			const view = getDefaultView(this.props.user, tail);

			if (view) {
				this.open(view);
			}
		}

		this.setState({
			tail: _.sortBy<Card>(tail, 'name'),
		});
	}

	public open = (card: Card, options?: any) => {
		if (this.props.viewNotices[card.id]) {
			this.props.actions.removeViewNotice(card.id);
			this.props.actions.setActiveView(card.id);
		}
		this.props.actions.addChannel(createChannel({
			target: card.id,
			cardType: 'view',
			head: card,
			parentChannel: this.props.channel.id,
			options,
		}));
	}

	public logout = () => {
		this.props.actions.logout();
	}

	public showMenu = () => {
		this.setState({ showMenu: true });
	}

	public hideMenu = () => {
		this.setState({ showMenu: false });
	}

	public showChangelog = () => {
		this.setState({ showChangelog: true });
	}

	public hideChangelog = () => {
		this.setState({ showChangelog: false });
	}

	public isExpanded(name: string): boolean {
		return _.get(this.props.uiState, [ 'sidebar', 'expanded' ], []).indexOf(name) > -1;
	}

	public toggleExpandGroup = (event: React.MouseEvent<HTMLButtonElement>) => {
		const name = event.currentTarget.dataset.groupname!;
		const state = _.cloneDeep(this.props.uiState);
		if (this.isExpanded(name)) {
			state.sidebar.expanded = _.without(state.sidebar.expanded, name);
		} else {
			state.sidebar.expanded.push(name);
		}
		this.props.actions.setUIState(state);
	}

	public groupViews = (tail: Card[]) => {
		const groups: any = [];

		// Sorty by name, then sort the priority views to the top
		const [ defaults, nonDefaults ] = _.partition<Card>(tail, (view) => {
			return _.includes(PRIORITY_VIEWS, view.slug);
		});

		groups.push({
			name: 'defaults',
			views: defaults,
			key: '__defaults',
		});

		const [ myViews, otherViews ] = _.partition<Card>(nonDefaults, (view) => {
			return _.includes(view.markers, this.props.user!.slug);
		});

		if (myViews.length) {
			groups.push({
				name: 'My views',
				views: myViews,
				key: '__myviews',
			});
		}

		const remaining = _.groupBy(otherViews, 'markers[0]');

		_.forEach(remaining, (views, key) => {
			if (key !== 'undefined') {
				const org = _.find(this.props.orgs, { slug: key });
				groups.push({
					name: org ? org.name : 'Unknown organisation',
					key,
					views,
				});
			}
		});

		return groups;
	}

	public render(): React.ReactNode {
		const {
			channels,
			channel: {
				data: { head },
			},
			user,
		} = this.props;
		const { tail } = this.state;
		const activeChannel = channels.length > 1 ? channels[1] : null;
		const email = user ? user.data.email : null;
		const username = user ? user.slug!.replace(/user-/, '') : null;

		if (!head) {
			return <Icon style={{color: 'white'}} name="cog fa-spin" />;
		}

		const [ [ defaultViews ], groups ] = _.partition(this.groupViews(tail || []), (g) => {
			return g.key === '__defaults';
		});

		const defaultUpdate = _.some(defaultViews.views, (card) => {
			const update = this.props.viewNotices[card.id];
			return update && (update.newMentions || update.newContent);
		});

		return (
			<Flex
				className="home-channel"
				flexDirection="column"
				flex="0 0 180px"
				style={{ height: '100%', overflowY: 'auto' }}
			>
				<Flex
					justify="space-between"
					style={{ position: 'relative' }}
				>
					<UserMenuBtn
						plaintext={true}
						className="user-menu-toggle"
						py={3}
						pl={3}
						pr={2}
						onClick={this.showMenu}
					>
						<Gravatar email={email} />

						{!!username && <Txt mx={2}>{username}</Txt>}

						<Icon name="caret-down" />

						{defaultUpdate && (
							<Icon
								name="circle"
								style={{
									color: 'green',
									top: 44,
									left: 44,
									fontSize: 11,
									position: 'absolute',
								}}
							/>
						)}
					</UserMenuBtn>
				</Flex>

				{this.state.showMenu &&
					<Fixed
						top={true}
						right={true}
						bottom={true}
						left={true}
						z={9999999}
						onClick={this.hideMenu}
					>
						<MenuPanel className="user-menu" mx={3} p={3}>
							{user && (
								<Link mb={2} href={`#/${user.id}`}>Your profile</Link>
							)}

							{_.map(defaultViews.views, (card) => {
									const isActive = card.id === _.get(activeChannel, [ 'data' , 'target' ]);
									const activeSlice = _.get(activeChannel, [ 'data', 'options', 'slice' ]);

									const update = this.props.viewNotices[card.id];

									return (
										<Box mx={-3}>
											<ViewLink
												key={card.id}
												card={card}
												isActive={isActive}
												activeSlice={activeSlice}
												update={update}
												open={this.open}
											/>
										</Box>
									);
							})}

							<Divider my={2} bg="#eee" style={{height: 1, backgroundColor: '#eeeeee'}} />

							<Button
								w="100%"
								pt={2}
								className="user-menu__logout"
								plaintext={true}
								style={{textAlign: 'left', display: 'block'}}
								onClick={this.logout}
							>
								Log out
							</Button>
						</MenuPanel>
					</Fixed>
				}

				<Box flex="1">
					{!tail && <Box p={3}><Icon style={{color: 'white'}} name="cog fa-spin" /></Box>}

					{!!tail && _.map(groups, (group) => {
						const isExpanded = this.isExpanded(group.name);
						return (
							<React.Fragment key={group.name}>
								<Button
									plaintext
									primary
									w="100%"
									px={3}
									my={2}
									data-groupname={group.name}
									className={`home-channel__group-toggle--${group.key}`}
									onClick={this.toggleExpandGroup}
								>
									<Flex
										style={{width: '100%'}}
										justify="space-between"
									>
										{group.name}
										<Icon name={`chevron-${isExpanded ? 'up' : 'down'}`} />
									</Flex>
								</Button>

								<div style={{display: isExpanded ? 'block' : 'none'}}>
									{_.map(group.views, (card) => {
										// A view shouldn't be able to display itself
										if (card.id === head!.id) {
											return null;
										}

										const isActive = card.id === _.get(activeChannel, [ 'data' , 'target' ]);
										const activeSlice = _.get(activeChannel, [ 'data', 'options', 'slice' ]);

										const update = this.props.viewNotices[card.id];

										return (
											<ViewLink
												key={card.id}
												card={card}
												isActive={isActive}
												activeSlice={activeSlice}
												update={update}
												open={this.open}
											/>
										);
									})}
								</div>
							</React.Fragment>
						);
					})}

				</Box>
				<Link
					p={2}
					fontSize={1}
					onClick={this.showChangelog}
				>
					<Txt monospace>
						v{this.props.version} {this.props.codename}
					</Txt>
				</Link>

				{this.state.showChangelog &&
					<Modal
						done={this.hideChangelog}
					>
						<Markdown>{this.props.changelog || ''}</Markdown>
					</Modal>
				}

			</Flex>
		);
	}
}

const mapStateToProps = (state: StoreState) => {
	return {
		changelog: selectors.getChangelog(state),
		channels: selectors.getChannels(state),
		user: selectors.getCurrentUser(state),
		version: selectors.getAppVersion(state),
		orgs: selectors.getOrgs(state),
		codename: selectors.getAppCodename(state),
		viewNotices: selectors.getViewNotices(state),
		uiState: selectors.getUIState(state),
	};
};

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export const HomeChannel = connect(mapStateToProps, mapDispatchToProps)(HomeChannelBase);
