/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { circularDeepEqual } from 'fast-equals';
import classnames from 'classnames';
import memoize from 'memoize-one';
import * as _ from 'lodash';
import React from 'react';
import { Box, Button, Divider, Fixed, Flex, Link, Txt } from 'rendition';
import { useSwipeable } from 'react-swipeable';
import styled from 'styled-components';
import {
	ActionButton,
	ActionRouterLink,
	helpers,
	Icon,
	MentionsCount,
	MenuPanel,
	UserAvatarLive,
} from '@balena/jellyfish-ui-components';
import { core } from '@balena/jellyfish-types';
import TreeMenu from './TreeMenu';
import UserStatusMenuItem from '../UserStatusMenuItem';
import ViewLink from '../ViewLink';
import OmniSearch from '../OmniSearch';
import { registerForNotifications } from '../../services/notifications';
import { ChatButton } from './ChatButton';

// Slide-in delay in seconds
const DELAY = 0.6;

const HomeChannelWrapper = styled(Flex)`
	&.collapsed {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: 100%;
	}
`;

const HomeChannelBackdrop = styled(Box)`
	z-index: 16;
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	right: 0;
	transition: visibility 0s ${DELAY}s;
	visibility: hidden;
	.drawer--open & {
		visibility: visible;
		transition: visibility 0s 0s;
		&::after {
			background: ${(props) => {
				return props.theme.layer!.overlay!.background as string;
			}};
			transition: background ${DELAY / 2}s 0s;
		}
	}
	&::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: 0 0;
		cursor: pointer;
		transition: background ${DELAY / 2}s ${DELAY / 2}s;
	}
`;

const HomeChannelDrawer = styled(Flex)`
	transition-property: transform;
	transition-duration: ${DELAY / 2}s;
	z-index: 16;
	.collapsed & {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 100%;
		max-width: 85%;
		transform: translate3d(-100%, 0, 0);
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);
	}
	.collapsed.drawer-open {
		width: 90%;
		transition-duration: ${DELAY / 2}s;
		transform: translate3d(0, 0, 0);
	}
	.collapsed.sliding & {
		transition-duration: 0s;
	}
	flex-direction: row-reverse;
	align-items: center;
	background: #fff;
`;

const HomeChannelContent = styled(Flex)`
	flex: 1;
	align-self: stretch;
	background: #fff;
`;

const GrabHandleWrapper = styled(Box)`
	margin-right: -15px;
	padding: 25px 5px;
	border-radius: 0 4px 4px 0;
	border-top: 1px solid #ddd;
	border-right: 1px solid #ddd;
	border-bottom: 1px solid #ddd;
	background: #fff;
	box-shadow: 0 5px 10px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);
`;

const GrabHandle: React.FunctionComponent<any> = ({
	children,
	onSwiping,
	onSwipedRight,
	onSwipedLeft,
	...props
}) => {
	const handlers = helpers.isiOS()
		? null
		: useSwipeable({
				onSwiping,
				onSwipedRight,
				onSwipedLeft,
		  });
	return (
		<GrabHandleWrapper {...handlers} {...props}>
			{children}
		</GrabHandleWrapper>
	);
};

const GrabHandleGrip = styled.div`
	border-left: 1px solid grey;
	border-right: 1px solid grey;
	width: 5px;
	height: 30px;
`;

// View slugs that should be displayed first
const DEFAULT_VIEWS = ['view-my-conversations', 'view-my-orgs'];

const getStarredViews = memoize((starredViews) => {
	return _.reduce(
		starredViews,
		(acc, viewSlug) => {
			acc[viewSlug] = true;
			return acc;
		},
		{},
	);
});

const viewsToTree = (starredViews, views, root = {}, namespaced = true) => {
	const result: any = _.defaults(root, {
		name: null,
		key: 'root',
		children: [],
	});

	for (const view of views) {
		let node = result;
		if (namespaced && view.data.namespace) {
			const parts = view.data.namespace.split('.');
			for (const part of parts) {
				let exists = false;
				for (const item of result.children) {
					if (item.name === part) {
						node = item;
						exists = true;
						break;
					}
				}

				if (!exists) {
					node.children.push({
						name: part,
						key: part,
						children: [],
					});

					node = node.children[node.children.length - 1];
				}
			}
		}

		node.children.push({
			name: view.name,
			key: view.slug,
			isStarred: Boolean(starredViews[view.slug]),
			card: view,
			children: [],
		});
	}

	return result;
};

const cleanPath = (location) => {
	// React-router sometimes appends a stray '.' to the end of the pathname!
	return location.pathname.replace(/\.$/, '');
};

const groupViews = memoize<any>(
	(tail, usersStarredViews, userSlug, repos: core.Contract[], orgs) => {
		const sortedTail = _.sortBy(tail, 'name');
		const groups: any = {
			defaults: [],
			main: {
				name: null,
				key: 'root',
				children: [],
			},
		};

		const userStarredViews = getStarredViews(usersStarredViews);

		// Sorty by name, then sort the priority views to the top
		const [defaults, nonDefaults] = _.partition(sortedTail, (view) => {
			return _.includes(DEFAULT_VIEWS, view.slug);
		});
		groups.defaults = defaults;

		const starredViews: any[] = [];
		const addToStarredViewsIfStarred = (view) => {
			if (userStarredViews[view.slug]) {
				starredViews.push(view);
			}
		};
		_.forEach(repos, addToStarredViewsIfStarred);
		_.forEach(sortedTail, addToStarredViewsIfStarred);

		if (starredViews.length) {
			const starredViewsTree = viewsToTree(
				userStarredViews,
				starredViews,
				{
					name: 'Starred',
					key: '__starredViews',
				},
				false,
			);
			groups.main.children.push(starredViewsTree);
		}

		// Add the repositories to the top of the sidebar
		groups.main.children.push({
			name: 'Repositories',
			key: 'repos',
			children: (repos || []).map((repo) => {
				return {
					name: (repo.name || repo.slug).replace(/^.*\//, ''),
					key: repo.slug,
					card: repo,
					isStarred: false,
					children: [],
				};
			}),
		});

		const splitViews: {
			myViews: core.ViewContract[];
			oneToOneViews: core.ViewContract[];
			otherViews: core.ViewContract[];
		} = {
			myViews: [],
			oneToOneViews: [],
			otherViews: [],
		};

		const { myViews, oneToOneViews, otherViews } = _.reduce(
			nonDefaults,
			(acc, view) => {
				if (view.slug.startsWith('view-121')) {
					acc.oneToOneViews.push(view);
				} else if (view.markers.includes(userSlug)) {
					acc.myViews.push(view);
				} else {
					acc.otherViews.push(view);
				}
				return acc;
			},
			splitViews,
		);

		if (myViews.length) {
			groups.main.children.push(
				viewsToTree(userStarredViews, myViews, {
					name: 'My views',
					key: '__myViews',
				}),
			);
		}
		if (oneToOneViews.length) {
			groups.main.children.push(
				viewsToTree(userStarredViews, oneToOneViews, {
					name: 'Private chats',
					key: '__oneToOneViews',
				}),
			);
		}
		const remaining = _.groupBy(otherViews, 'markers[0]');
		_.forEach(remaining, (views, key) => {
			if (key !== 'undefined') {
				const org = _.find(orgs, {
					slug: key,
				});
				groups.main.children.push(
					viewsToTree(userStarredViews, views, {
						name: org ? org.name : 'Unknown organisation',
						key,
					}),
				);
			}
		});

		return groups;
	},
);

const viewLinkActionNames = ['setDefault', 'removeView', 'setViewStarred'];
const treeMenuActionNames = [
	'setDefault',
	'removeView',
	'setViewStarred',
	'setSidebarExpanded',
];
const pickViewLinkActions = memoize(_.pick);
const pickTreeMenuActions = memoize(_.pick);

export default class HomeChannel extends React.Component<any, any> {
	wrapper: any;
	open: any;

	constructor(props) {
		super(props);
		this.state = {
			showDrawer: false,
			sliding: false,
			showMenu: false,
			messages: [],
		};

		if (this.props.channel.data.head) {
			this.props.actions.loadViewData(this.props.channel.data.head);
			this.fetchRepos();
		}

		this.wrapper = React.createRef();
	}

	openCreateViewChannel = () => {
		this.props.actions.addChannel({
			head: {
				onDone: {
					action: 'open',
				},
			},
			format: 'createView',
			canonical: false,
		});
		this.hideDrawer();
	};

	openChatWidget = () => {
		this.props.actions.setChatWidgetOpen(true);
		this.hideDrawer();
	};

	showMenu = () => {
		this.setState({
			showMenu: true,
		});
	};

	hideMenu = () => {
		this.setState({
			showMenu: false,
		});
	};

	showDrawer = () => {
		if (this.props.isMobile) {
			this.wrapper.current.style.transform = 'translate3d(0, 0, 0)';
			this.setState({
				showDrawer: true,
				sliding: false,
			});
		}
	};

	hideDrawer = () => {
		if (this.props.isMobile) {
			this.wrapper.current.style.transform = 'translate3d(-100%, 0, 0)';
			this.setState({
				showDrawer: false,
				sliding: false,
			});
		}
	};

	toggleDrawerIOS = () => {
		if (this.state.showDrawer) {
			this.hideDrawer();
		} else {
			this.showDrawer();
		}
	};

	onGrabHandleSwiping = (event) => {
		// As we move the grab handle, directly update the 'transform' styling of the drawer element
		const xPercent =
			100 * ((event.initial[0] - event.deltaX) / this.props.windowSize.width);
		if (event.first) {
			this.setState({
				sliding: true,
			});
		}
		this.wrapper.current.style.transform = `translate3d(-${
			100 - _.clamp(xPercent, 0, 100)
		}%, 0, 0)`;
	};

	fetchRepos = () => {
		const { actions, activeLoop } = this.props;
		// TODO: Filtering by owner is a temporary measure that is imperfect. Ultimately
		//       we want to filter by the `loop` field. But first we will need to:
		//       a) update the GitHub sync integration to automatically set the `loop` field
		//          when syncing new repos.
		//       b) manually migrate all existing repos to the correct loop
		//       Then we can modify this query to filter based on the top-level loop field.
		// Note: Currently this just defaults to product-os if no loop is specified ('All loops')
		//       This avoids us fetching a ridiculous list of repos.
		// Note: The loop slug prefix may change - at which point, if we're still filtering by
		//       owner based on the active loop, this replace regex will need to change too!
		const repoOwner = activeLoop
			? activeLoop.replace(/^loop[-\/]/, '').split('@')[0]
			: 'product-os';
		actions
			.queryAPI(
				{
					type: 'object',
					required: ['type', 'data'],
					properties: {
						type: {
							const: 'repository@1.0.0',
						},
						data: {
							type: 'object',
							required: ['owner'],
							properties: {
								owner: {
									const: repoOwner,
								},
							},
						},
					},
				},
				{
					sortBy: 'name',
				},
			)
			// TS-TODO: results should be of type RepositoryContract[]
			.then((repos: core.Contract[]) => {
				this.setState({ repos });
			});
	};

	logout = () => {
		this.props.actions.logout();
	};

	shouldComponentUpdate(nextProps, nextState) {
		return (
			!circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props)
		);
	}

	componentDidMount() {
		const { actions, location, history, homeView } = this.props;
		if (location.pathname === '/') {
			if (homeView) {
				history.push(homeView);
			}
		}

		// Register for desktop notifications now that we're safely logged in
		// (This keeps Firefox happy)
		registerForNotifications();
	}

	componentDidUpdate(prevProps) {
		if (!prevProps.channel.data.head && this.props.channel.data.head) {
			this.props.actions.loadViewData(this.props.channel.data.head);
			this.fetchRepos();
		}
		if (
			this.state.showMenu &&
			prevProps.location.pathname !== this.props.location.pathname
		) {
			this.hideMenu();
		}
		if (this.props.isMobile) {
			if (this.wrapper.current) {
				const prevPath = cleanPath(prevProps.location);
				const currentPath = cleanPath(this.props.location);
				if (
					(prevProps.channels.length === 2 &&
						this.props.channels.length === 1) ||
					(prevPath !== '/' && currentPath === '/') ||
					(currentPath === '/' &&
						prevProps.isChatWidgetOpen &&
						!this.props.isChatWidgetOpen)
				) {
					this.showDrawer();
				} else if (
					prevPath !== currentPath ||
					(this.props.isChatWidgetOpen && !prevProps.isChatWidgetOpen)
				) {
					this.hideDrawer();
				}
			}
		}
	}

	render() {
		const {
			isMobile,
			subscriptions,
			types,
			actions,
			channels,
			channel: {
				data: { head },
			},
			location,
			user,
			orgs,
			tail,
			starredViews,
			isChatWidgetOpen,
			mentions,
		} = this.props;

		const viewLinkActions = pickViewLinkActions(actions, viewLinkActionNames);
		const treeMenuActions = pickTreeMenuActions(actions, treeMenuActionNames);

		const { repos, showDrawer, sliding } = this.state;
		const activeChannel = channels.length > 1 ? channels[1] : null;
		const username = user ? user.name || user.slug.replace(/user-/, '') : null;
		if (!head) {
			return (
				<Box p={3}>
					<Icon spin name="cog" />
				</Box>
			);
		}
		const groupedViews = groupViews(tail, starredViews, user.slug, repos, orgs);
		const groups = groupedViews.main;
		const defaultViews = groupedViews.defaults;
		const activeChannelTarget = _.get(activeChannel, ['data', 'target']);
		const activeSlice = _.get(activeChannel, ['data', 'options', 'slice']);

		const collapsed =
			isMobile &&
			(channels.length > 1 || cleanPath(location) !== '/' || isChatWidgetOpen);

		const grabHandleProps = helpers.isiOS()
			? {
					onClick: this.toggleDrawerIOS,
			  }
			: {
					onSwiping: this.onGrabHandleSwiping,
					onSwipedRight: this.showDrawer,
					onSwipedLeft: this.hideDrawer,
			  };

		return (
			<HomeChannelWrapper
				flex={['0 0 100%', '0 0 100%', '0 0 180px']}
				data-test="home-channel"
				className={classnames('home-channel', {
					collapsed,
					sliding,
					'drawer--open': showDrawer,
				})}
			>
				{collapsed && (
					<HomeChannelBackdrop
						data-test="home-channel__backdrop"
						flex={1}
						onClick={showDrawer ? this.hideDrawer : (null as any)}
					/>
				)}
				<HomeChannelDrawer
					flex={1}
					data-test="home-channel__drawer"
					ref={this.wrapper}
					onClick={helpers.swallowEvent as any}
				>
					{collapsed && (
						<GrabHandle
							data-test="home-channel__grab-handle"
							delta={1}
							{...grabHandleProps}
						>
							<GrabHandleGrip />
						</GrabHandle>
					)}

					<HomeChannelContent
						maxWidth={['100%', '100%', '180px']}
						flexDirection="column"
						data-test="home-channel__content"
					>
						<Flex
							flexDirection="column"
							style={{
								position: 'relative',
								borderBottom: '1px solid #eee',
							}}
						>
							<Flex
								className="user-menu-toggle"
								py={3}
								pl={3}
								pr={2}
								alignItems="center"
								maxWidth="100%"
								onClick={this.showMenu}
								style={{
									cursor: 'pointer',
									position: 'relative',
								}}
							>
								<UserAvatarLive emphasized userId={user.id} />
								{Boolean(username) && (
									<Txt
										mx={2}
										style={{
											textOverflow: 'ellipsis',
											flex: '1 1 0%',
											fontWeight: 600,
											whiteSpace: 'nowrap',
											overflow: 'hidden',
										}}
									>
										{username}
									</Txt>
								)}

								<Icon name="caret-down" />

								{mentions && mentions.length > 0 && (
									<MentionsCount
										style={{
											position: 'absolute',
											left: '30px',
											bottom: '10px',
										}}
										tooltip={`${mentions.length} notifications`}
										data-test="homechannel-mentions-count"
									>
										{mentions.length >= 100 ? '99+' : mentions.length}
									</MentionsCount>
								)}
							</Flex>
							<OmniSearch ml={3} mr={2} />
						</Flex>

						{this.state.showMenu && (
							<Fixed
								top={true}
								right={true}
								bottom={true}
								left={true}
								z={10}
								onClick={this.hideMenu}
							>
								<MenuPanel className="user-menu" mx={3} py={2}>
									{user && (
										<UserStatusMenuItem
											user={user}
											actions={actions}
											types={types}
										/>
									)}

									{user && (
										<ActionRouterLink to={`/${user.slug}`}>
											Settings
										</ActionRouterLink>
									)}

									<ActionRouterLink to="/inbox">
										<Flex justifyContent="space-between">
											Inbox
											{mentions && mentions.length > 0 && (
												<MentionsCount mr={2}>{mentions.length}</MentionsCount>
											)}
										</Flex>
									</ActionRouterLink>

									{_.map(defaultViews, (card) => {
										const isActive =
											card.slug === activeChannelTarget ||
											card.id === activeChannelTarget;

										// The inbox view is only used to easily facilitate streaming of
										// mentions
										// TODO Remove this once the `view-my-inbox` card has been removed
										// from Jellyfish
										if (card.slug === 'view-my-inbox') {
											return null;
										}

										return (
											<ViewLink
												key={card.id}
												userSlug={user.slug}
												subscription={subscriptions[card.id] || null}
												types={types}
												actions={viewLinkActions}
												card={card}
												isActive={isActive}
												activeSlice={activeSlice}
												open={this.open}
											/>
										);
									})}

									<Box mx={3}>
										<Divider height={1} />
									</Box>

									<ActionButton
										className="user-menu__logout"
										plain
										onClick={this.logout}
									>
										Log out
									</ActionButton>
								</MenuPanel>
							</Fixed>
						)}

						<Box
							flex="1"
							py={2}
							style={{
								overflowY: 'auto',
							}}
						>
							{!tail && (
								<Box p={3}>
									<Icon spin name="cog" />
								</Box>
							)}

							{Boolean(tail) && (
								<TreeMenu
									userSlug={user.slug}
									subscriptions={subscriptions}
									node={groups}
									actions={treeMenuActions}
									activeChannel={activeChannel}
									viewNotices={this.props.viewNotices}
								/>
							)}
						</Box>

						<Box
							style={{
								borderTop: '1px solid #eee',
								borderBottom: '1px solid #eee',
							}}
							px={3}
							py={2}
						>
							<Button
								plain
								icon={<Icon name="plus" />}
								data-test="create-private-conversation"
								onClick={this.openCreateViewChannel}
								tooltip={{
									placement: 'right',
									text: 'Create a new private conversation',
								}}
							/>

							<ChatButton onClick={this.openChatWidget} />
						</Box>

						<Link
							p={2}
							fontSize={1}
							href="https://github.com/product-os/jellyfish/blob/master/CHANGELOG.md"
							blank
						>
							<Txt monospace>
								v{this.props.version} {this.props.codename}
							</Txt>
						</Link>
					</HomeChannelContent>
				</HomeChannelDrawer>
			</HomeChannelWrapper>
		);
	}
}
