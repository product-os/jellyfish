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
import { Card, Channel, RendererProps, ViewNotice } from '../../Types';
import { actionCreators, selectors, StoreState } from '../core/store';
import { createChannel } from '../services/helpers';
import Gravatar from './Gravatar';
import Icon from './Icon';
import { TailStreamer } from './TailStreamer';

// View slugs that should be displayed first
const PRIORITY_VIEWS = [
	'view-my-alerts',
	'view-my-mentions',
	'view-my-todo-items',
];

interface ViewLinkProps {
	card: Card;
	isActive: boolean;
	update?: {
		id: string;
		newMentions?: boolean;
		newContent?: boolean;
	};
	open: (card: Card) => void;
}

class ViewLink extends React.Component<ViewLinkProps, {}> {
	public open = () => {
		this.props.open(this.props.card);
	}
	render() {
		const { card, isActive, update } = this.props;
		return (
			<Link
				className={`home-channel__item home-channel__item--${card.slug}`}
				style={{display: 'block'}}
				key={card.id}
				bg={isActive ? '#666' : 'none'}
				py={2}
				px={3}
				color={isActive ? 'white' : '#c3c3c3'}
				onClick={this.open}
			>
				{card.name}

				{!!update &&
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
		);
	}
}

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
		border-bottom: 5px solid white;
		position: absolute;
    top: -5px;
		left: 14px;
	}
`;

const UserMenuBtn = styled(Button)`
	background: transparent;
	color: #c3c3c3;

	&:hover,
	&:focus,
	&:active {
		color: white;
	}
`;

interface HomeChannelProps extends RendererProps {
	changelog: string | null;
	channels: Channel[];
	user: Card | null;
	version: string | null;
	viewNotices: {
		[k: string]: ViewNotice;
	};
	actions: typeof actionCreators;
}

interface HomeChannelState {
	showChangelog: boolean;
	showMenu: boolean;
	tail: null | Card[];
	messages: Card[];
}

class Base extends TailStreamer<HomeChannelProps, HomeChannelState> {
	constructor(props: HomeChannelProps) {
		super(props);

		this.state = {
			showChangelog: false,
			showMenu: false,
			tail: null,
			messages: [],
		};

		this.streamTail(this.props.channel.data.target);
	}

	public shouldComponentUpdate(nextProps: HomeChannelProps, nextState: HomeChannelState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props);
	}

	public setTail(tail: Card[]) {
		tail.forEach(card => {
			this.props.actions.addSubscription(card.id);
			this.props.actions.streamView(card.id);
		});
		// If there is only 1 channel, open the all messages view by default
		if (this.props.channels.length === 1) {
			const allMessagesView = _.find(tail, { slug: 'view-all-messages' });
			if (allMessagesView) {
				this.open(allMessagesView);
			}
		}

		// Sorty by name, then sort the priority views to the top
		const [ first, rest ] = _.partition<Card>(_.sortBy<Card>(tail, 'name'), (view) => {
			return _.includes(PRIORITY_VIEWS, view.slug);
		});

		this.setState({
			tail: first.concat(rest),
		});
	}

	public open = (card: Card) => {
		if (this.props.viewNotices[card.id]) {
			this.props.actions.removeViewNotice(card.id);
			this.props.actions.setActiveView(card.id);
		}
		this.props.actions.addChannel(createChannel({
			target: card.id,
			head: card,
			parentChannel: this.props.channel.id,
		}));
	}

	public openMessageChannel = (id: string) => {
		this.props.actions.addChannel(createChannel({
			target: id,
			parentChannel: this.props.channel.id,
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

	public render() {
		const {
			channels,
			channel: {
				data: { head },
			},
			user,
		} = this.props;
		const { tail } = this.state;
		const activeCard = channels.length > 1 ? channels[1].data.target : null;
		const email = user ? user.data.email : null;
		const username = user ? user.slug!.replace(/user-/, '') : null;

		if (!head) {
			return <Icon style={{color: 'white'}} name="cog fa-spin" />;
		}

		return (
			<Flex
				className="home-channel"
				flexDirection="column"
				flex="0 0 180px"
				style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #ccc' }}
			>
				<Flex
					bg="#333"
					justify="space-between"
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
					</UserMenuBtn>
				</Flex>

				<Divider color="#ccc" m={0} style={{height: 1}} />

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
							<Button
								w="100%"
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

				<Box flex="1" bg="#333" pt={3}>
					{!tail && <Box p={3}><Icon style={{color: 'white'}} name="cog fa-spin" /></Box>}

					{!!tail && _.map(tail, (card) => {
						// A view shouldn't be able to display itself
						if (card.id === head!.id) {
							return null;
						}

						const isActive = card.id === activeCard;

						const update = this.props.viewNotices[card.id];

						return (
							<ViewLink
								key={card.id}
								card={card}
								isActive={isActive}
								update={update}
								open={this.open}
							/>
						);
					})}

				</Box>
				<Link
					bg="#333"
					color="white"
					p={2}
					fontSize={1}
					onClick={this.showChangelog}
				>
					<Txt monospace>
						v{this.props.version} - view changelog
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
		viewNotices: selectors.getViewNotices(state),
	};
};

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export const HomeChannel = connect(mapStateToProps, mapDispatchToProps)(Base);
