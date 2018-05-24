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
import { JellyfishStream } from '../../sdk/stream';
import { Card, RendererProps } from '../../Types';
import { connectComponent, ConnectedComponentProps, createChannel } from '../services/helpers';
import { SubscriptionManager } from '../services/subscriptions';
import EventCard from './Event';
import Gravatar from './Gravatar';
import Icon from './Icon';
import { TailStreamer } from './TailStreamer';

const MenuPanel = styled(Box)`
	position: absolute;
	top: 68px;
	width: 300px;
	background: white;
	box-shadow: 0 1px 4px rgba(17, 17, 17, 0.5);
	border-radius: 3px;
	min-height: 200px;

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

const MessagePanel = styled(Box)`
	position: absolute;
	top: 8px;
	left: 170px;
	width: 500px;
	background: white;
	box-shadow: 0 1px 4px rgba(17, 17, 17, 0.5);
	border-radius: 3px;
	min-height: 200px;
	max-height: 450px;
	overflow: auto;

	&::before {
		content: '';
    width: 0;
    height: 0;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
    border-right: 7px solid #ccc;
    position: absolute;
    top: 19px;
    left: -7px;
    opacity: 0.6;
	}

	&::after {
		content: '';
    width: 0;
    height: 0;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-right: 5px solid white;
    position: absolute;
    top: 21px;
    left: -5px;
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
	showMessages: boolean;
	tail: null | Card[];
	messages: Card[];
	messageViewId: string;
}

class Base extends TailStreamer<HomeChannelProps, HomeChannelState> {
	private subscriptionManager: SubscriptionManager;

	constructor(props: HomeChannelProps) {
		super(props);

		this.state = {
			showMenu: false,
			showMessages: false,
			tail: null,
			messages: [],
			messageViewId: '',
		};

		this.subscriptionManager = new SubscriptionManager();

		this.streamTail(this.props.channel.data.target);
	}

	/**
	 * Opens a stream listening for all chat messages that mention or alert the
	 * current user
	 */
	public handleMessageStream(stream: JellyfishStream) {
		stream.on('data', (response) => {
			this.setState({ messages: _.reverse(response.data) });
		});

		stream.on('update', (response) => {
			// If before is non-null then the card has been updated
			if (response.data.before) {
				return this.setState((prevState) => {
					if (prevState.messages) {
						const index = _.findIndex(prevState.messages, { id: response.data.before.id });
						prevState.messages.splice(index, 1, response.data.after);
					}
					return { messages: prevState.messages };
				});
			}

			const messages = this.state.messages.slice();
			messages.unshift(response.data.after);

			this.setState({ messages });
		});
	}

	public setTail(tail: Card[]) {
		const [ mentionsView ] = _.remove(tail, { slug: 'view-my-mentions' });
		tail.forEach(card => {
			this.subscriptionManager.subscribe(card);
		});
		this.setState({
			messageViewId: mentionsView.id,
			tail,
		});

		const stream = this.subscriptionManager.subscribe(mentionsView);

		this.handleMessageStream(stream);
	}

	public open(card: Card) {
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

	/**
	 * Display messages that the user is mentioned in, whilst removing any
	 * existing view notice
	 */
	public showMessages() {
		if (this.props.appState.viewNotices[this.state.messageViewId]) {
			this.props.actions.removeViewNotice(this.state.messageViewId);
		}
		this.setState({ showMessages: true });
	}

	public logout() {
		this.props.actions.logout();
	}

	public render() {
		const { appState, channel: { data: { head } } } = this.props;
		const { channels } = appState;
		const { tail } = this.state;
		const activeCard = channels.length > 1 ? channels[1].data.target : null;
		const email = _.get(appState, 'session.user') ? appState.session!.user!.data!.email : null;
		const username = _.get(appState, 'session.user') ? appState.session!.user!.slug!.replace(/user-/, '') : null;
		const newMessages = this.props.appState.viewNotices[this.state.messageViewId];

		if (!head) {
			return <Icon style={{color: 'white'}} name='cog fa-spin' />;
		}

		return (
			<Flex className='home-channel' flexDirection='column'
				flex='0 0 180px'
				style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #ccc' }}>
				<Flex
					bg='#333'
					justify='space-between'
				>
					<UserMenuBtn
						plaintext
						className='user-menu-toggle'
						py={3}
						pl={3}
						pr={2}
						onClick={() => this.setState({ showMenu: true })}>
						<Gravatar email={email} />

						{!!username && <Txt mx={2}>{username}</Txt>}

						<Icon name='caret-down' />
					</UserMenuBtn>

					<UserMenuBtn
						pl={2}
						pr={3}
						plaintext
						style={{position: 'relative'}}
						onClick={() => this.showMessages()}
					>
						<Icon name='bullhorn' />
						{!!newMessages &&
							<Icon name='circle' style={{
								color: 'orange',
								top: 19,
								right: 10,
								fontSize: 11,
								position: 'absolute',
							}} />}
					</UserMenuBtn>
				</Flex>

				<Divider color='#ccc' m={0} style={{height: 1}} />

				{this.state.showMenu &&
					<Fixed top right bottom left z={9999999} onClick={() => this.setState({ showMenu: false })}>
						<MenuPanel className='user-menu' mx={3} p={3}>
							<Button
								w='100%'
								className='user-menu__logout'
								plaintext
								style={{textAlign: 'left', display: 'block'}}
								onClick={() => this.logout()}>
								Log out
							</Button>
						</MenuPanel>
					</Fixed>
				}

				{this.state.showMessages &&
					<Fixed top right bottom left z={9999999} onClick={() => this.setState({ showMessages: false })}>
						<MessagePanel className='user-menu' mx={3} p={3}>
							{this.state.messages.map(card =>
								<Box key={card.id} py={3} style={{borderBottom: '1px solid #eee'}}>
									<EventCard
										users={this.props.appState.allUsers}
										openChannel={this.openMessageChannel}
										card={card}
									/>
								</Box>)}
						</MessagePanel>
					</Fixed>
				}

				<Box flex='1' bg='#333' pt={3}>
					{!tail && <Box p={3}><Icon style={{color: 'white'}} name='cog fa-spin' /></Box>}

					{!!tail && _.map(_.sortBy(tail, 'name'), (card) => {
						// A view shouldn't be able to display itself
						if (card.id === head!.id) {
							return null;
						}

						const isActive = card.id === activeCard;

						const update = this.props.appState.viewNotices[card.id];

						return (
							<Link
								className='home-channel__item'
								style={{display: 'block'}}
								key={card.id}
								bg={isActive ? '#666' : 'none'}
								py={2}
								px={3}
								color={isActive ? 'white' : '#c3c3c3'}
								onClick={() => this.open(card)}>
								{card.name}
								{!!update &&
										<Icon name='circle' style={{
											color: update.newContent ? 'green' : 'orange',
											marginTop: 4,
											float: 'right',
											fontSize: 11,
										}} />}
							</Link>
						);
					})}
				</Box>
			</Flex>
		);
	}
}

export const HomeChannel = connectComponent(Base)
