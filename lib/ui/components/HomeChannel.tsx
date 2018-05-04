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

const MenuPanel = styled(Box)`
	position: absolute;
	top: 68px;
	width: 300px;
	background: white;
	box-shadow: 0 1px 4px rgba(17, 17, 17, 0.2);
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

interface HomeChannelProps extends RendererProps, ConnectedComponentProps {}

interface HomeChannelState {
	showMenu: boolean;
	tail: null | Card[];
}

class Base extends TailStreamer<HomeChannelProps, HomeChannelState> {
	private subscriptionManager: SubscriptionManager;

	constructor(props: HomeChannelProps) {
		super(props);

		this.state = {
			showMenu: false,
			tail: null,
		};

		this.subscriptionManager = new SubscriptionManager();

		this.streamTail(this.props.channel.data.target);
	}

	public setTail(tail: Card[]) {
		this.subscriptionManager.updateSubscriptions(tail);
		this.setState({ tail });
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

		if (!head) {
			return <Icon style={{color: 'white'}} name='cog fa-spin' />;
		}

		return (
			<Flex className='home-channel' flexDirection='column'
				style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #ccc', minWidth: 220 }}>
				<Flex
					className='user-menu-toggle'
					bg='#333'
					align='center'
					color='white'
					px={3}
					py={18}
					style={{ cursor: 'pointer'}}
					onClick={() => this.setState({ showMenu: true })}>
					<Gravatar email={email} />

					{!!username && <Txt mx={3}>{username}</Txt>}

					<Icon name='caret-down' />
				</Flex>

				<Divider color='#ccc' m={0} />

				{this.state.showMenu &&
					<Fixed z={9999999} onClick={() => this.setState({ showMenu: false })}>
						<MenuPanel className='user-menu' mx={3} p={3}>
							<Button className='user-menu__logout' plaintext onClick={() => this.logout()}>Log out</Button>
						</MenuPanel>
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
