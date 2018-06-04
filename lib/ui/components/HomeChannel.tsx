import * as _ from 'lodash';
import * as React from 'react';
import {
	Box,
	Button,
	Divider,
	Fixed,
	Flex,
	Link,
	Txt,
} from 'rendition';
import styled from 'styled-components';
import { Card, RendererProps } from '../../Types';
import { connectComponent, ConnectedComponentProps, createChannel } from '../services/helpers';
import { SubscriptionManager } from '../services/subscriptions';
import Gravatar from './Gravatar';
import Icon from './Icon';
import { TailStreamer } from './TailStreamer';

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
				className="home-channel__item"
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

interface HomeChannelProps extends RendererProps, ConnectedComponentProps {}

interface HomeChannelState {
	showMenu: boolean;
	tail: null | Card[];
	messages: Card[];
}

class Base extends TailStreamer<HomeChannelProps, HomeChannelState> {
	private subscriptionManager: SubscriptionManager;

	constructor(props: HomeChannelProps) {
		super(props);

		this.state = {
			showMenu: false,
			tail: null,
			messages: [],
		};

		this.subscriptionManager = new SubscriptionManager();

		this.streamTail(this.props.channel.data.target);
	}

	public setTail(tail: Card[]) {
		tail.forEach(card => {
			this.subscriptionManager.subscribe(card);
		});
		// If there is only 1 channel, open the all messages view by default
		if (this.props.appState.channels.length === 1) {
			const allMessagesView = _.find(tail, { slug: 'view-all-messages' });
			if (allMessagesView) {
				this.open(allMessagesView);
			}
		}
		this.setState({
			tail,
		});
	}

	public open = (card: Card) => {
		if (this.props.appState.viewNotices[card.id]) {
			this.props.actions.removeViewNotice(card.id);
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

	public render() {
		const { appState, channel: { data: { head } } } = this.props;
		const { channels } = appState;
		const { tail } = this.state;
		const activeCard = channels.length > 1 ? channels[1].data.target : null;
		const email = _.get(appState, 'session.user') ? appState.session!.user!.data!.email : null;
		const username = _.get(appState, 'session.user') ? appState.session!.user!.slug!.replace(/user-/, '') : null;

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

					{!!tail && _.map(_.sortBy(tail, 'name'), (card) => {
						// A view shouldn't be able to display itself
						if (card.id === head!.id) {
							return null;
						}

						const isActive = card.id === activeCard;

						const update = this.props.appState.viewNotices[card.id];

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
				<Txt
					bg="#333"
					color="white"
					monospace
					fontSize={1}
				>
					{this.props.appState.config.version}
				</Txt>
			</Flex>
		);
	}
}

export const HomeChannel = connectComponent(Base);
