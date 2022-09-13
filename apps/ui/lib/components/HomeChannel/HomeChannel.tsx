import { circularDeepEqual } from 'fast-equals';
import classnames from 'classnames';
import memoize from 'memoize-one';
import _ from 'lodash';
import React from 'react';
import { Box, Button, Flex, Link, Txt } from 'rendition';
import { useSwipeable } from 'react-swipeable';
import styled from 'styled-components';
import { Icon, withSetup, Setup } from '../';
import * as helpers from '../../services/helpers';
import type {
	JsonSchema,
	OrgContract,
	TypeContract,
	UserContract,
	ViewContract,
} from 'autumndb';
import TreeMenu from './TreeMenu';
import { ResponsiveContextProps } from '../../hooks/use-responsive-context';
import { registerForNotifications } from '../../services/native-notifications';
import { ChatButton } from './ChatButton';
import type { ExtendedSocket } from '@balena/jellyfish-client-sdk/build/types';
import { actionCreators } from '../../store';
import { BoundActionCreators, ChannelContract } from '../../types';
import { RouteComponentProps } from 'react-router-dom';

// Slide-in delay in seconds
const DELAY = 0.6;

const HomeChannelWrapper = styled(Flex)`
	min-height: 0;
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

const HomeChannelDrawer = styled(Flex)<{ isMobile: boolean }>`
	transition-property: transform;
	transition-duration: ${DELAY / 2}s;
	z-index: ${(props) => (props.isMobile ? '16' : 'auto')};
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

const viewsToTree = (views, root = {}, namespaced = true) => {
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

const groupViews = memoize<any>((tail, bookmarks, userId, orgs) => {
	const sortedTail = _.sortBy(tail, ['data.namespace', 'name']);
	const groups: any = {
		defaults: [],
		main: {
			name: null,
			key: 'root',
			children: [],
		},
	};

	if (bookmarks && bookmarks.length) {
		for (const bookmark of bookmarks) {
			if (bookmark.name && bookmark.name.length > 30) {
				bookmark.name = `${bookmark.name.substring(0, 29)}...`;
			}
		}
		const bookmarksTree = viewsToTree(
			bookmarks,
			{
				name: 'Bookmarks',
				key: '__bookmarks',
				icon: 'bookmark',
			},
			false,
		);
		groups.main.children.push(bookmarksTree);
	}

	const splitViews: {
		myViews: ViewContract[];
		oneToOneViews: ViewContract[];
		otherViews: ViewContract[];
	} = {
		myViews: [],
		oneToOneViews: [],
		otherViews: [],
	};

	const { myViews, oneToOneViews, otherViews } = _.reduce(
		sortedTail,
		(acc, view) => {
			if (view.data.dms) {
				acc.oneToOneViews.push(view);
			} else if (view.data.actor === userId) {
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
			viewsToTree(myViews, {
				name: 'Custom views',
				key: '__myViews',
				icon: 'eye',
			}),
		);
	}
	if (oneToOneViews.length) {
		groups.main.children.push(
			viewsToTree(oneToOneViews, {
				name: '1 to 1s',
				key: '__oneToOneViews',
				icon: 'comments',
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
				viewsToTree(views, {
					name: org ? org.name : 'Unknown organisation',
					key,
					icon: 'folder',
				}),
			);
		}
	});

	return groups;
});

const treeMenuActionNames = ['setDefault', 'removeView', 'setSidebarExpanded'];
const pickTreeMenuActions = memoize(_.pick);

const bookmarksQuery = (userId: string): JsonSchema => {
	return {
		type: 'object',
		$$links: {
			'is bookmarked by': {
				type: 'object',
				required: ['id', 'type'],
				properties: {
					type: {
						const: 'user@1.0.0',
					},
					id: {
						const: userId,
					},
				},
			},
		},
	};
};

export interface StateProps {
	channels: ChannelContract[];
	codename: string | null;
	orgs: OrgContract[];
	types: TypeContract[];
	activeLoop: string | null;
	isChatWidgetOpen: boolean;
	user: UserContract;
	homeView: string | null;
	version: string | null;
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}
export interface OwnProps {
	channel: ChannelContract;
}

type Props = Setup &
	RouteComponentProps &
	ResponsiveContextProps &
	StateProps &
	DispatchProps &
	OwnProps;

interface State {
	showDrawer: boolean;
	showMenu: boolean;
	sliding: boolean;
	messages: any[];
	results: any[];
	bookmarks: any[];
}

export default withSetup(
	class HomeChannel extends React.Component<Props, State> {
		primaryStream: ExtendedSocket | null = null;
		bookmarkStream: ExtendedSocket | null = null;
		wrapper: any;
		open: any;

		constructor(props) {
			super(props);
			this.state = {
				showDrawer: false,
				sliding: false,
				showMenu: false,
				messages: [],
				results: [],
				bookmarks: [],
			};

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
				100 *
				((event.initial[0] - event.deltaX) /
					(this.props.windowSize?.width || 500));
			if (event.first) {
				this.setState({
					sliding: true,
				});
			}
			this.wrapper.current.style.transform = `translate3d(-${
				100 - _.clamp(xPercent, 0, 100)
			}%, 0, 0)`;
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

		async componentDidMount() {
			const { history, homeView, location } = this.props;

			if (location.pathname === '/') {
				if (homeView) {
					history.push(homeView);
				}
			}

			// Register for desktop notifications now that we're safely logged in
			// (This keeps Firefox happy)
			// TODO: Move this to the "Authorized" component
			registerForNotifications();

			this.loadData();
		}

		componentDidUpdate(prevProps) {
			if (prevProps.activeLoop !== this.props.activeLoop) {
				this.loadData();
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

		loadData = async () => {
			const { channel, user, sdk } = this.props;

			if (!channel.data.target) {
				throw new Error('No target specified');
			}

			const card = await sdk.card.get(channel.data.target);
			const getData = async (
				name: 'results' | 'bookmarks',
				query: JsonSchema,
			) => {
				const streamProp = `${name}Stream`;
				if (this[streamProp]) {
					this[streamProp].close();
					this[streamProp] = null;
				}
				const stream = await sdk.stream(query);
				this[streamProp] = stream;
				const results = await sdk.query(query, {
					sortBy: 'name',
					sortDir: 'asc',
				});
				this.setState({
					[name]: results,
				} as any);
				stream.on('update', (response) => {
					const { after } = response.data;
					if (after) {
						const resultsHash = _.keyBy(this.state[name], 'id');
						resultsHash[after.id] = after;
						this.setState({ [name]: _.values(resultsHash) } as any);
					}
				});
			};
			if (card) {
				await Promise.all([
					getData('results', helpers.getViewSchema(card, user)),
					getData('bookmarks', bookmarksQuery(user.id)),
				]);
			}
		};

		render() {
			const {
				isMobile,
				actions,
				channels,
				location,
				user,
				orgs,
				isChatWidgetOpen,
			} = this.props;
			const { results, bookmarks } = this.state;

			const treeMenuActions = pickTreeMenuActions(actions, treeMenuActionNames);

			const { showDrawer, sliding } = this.state;
			const activeChannel = channels.length > 1 ? channels[1] : null;
			const groupedViews = groupViews(results, bookmarks, user.id, orgs);
			const groups = groupedViews.main;

			const collapsed =
				isMobile &&
				(channels.length > 1 ||
					cleanPath(location) !== '/' ||
					isChatWidgetOpen);

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
						isMobile={isMobile}
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
							<Box
								flex="1"
								py={2}
								style={{
									overflowY: 'auto',
								}}
							>
								{!results.length && (
									<Box p={3}>
										<Icon spin name="cog" />
									</Box>
								)}

								{results.length > 0 && (
									<TreeMenu
										node={groups}
										actions={treeMenuActions}
										activeChannel={activeChannel}
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
	},
);
