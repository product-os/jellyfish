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
	Txt,
} from 'rendition';
import styled from 'styled-components';
import { Card, JellyfishState, RendererProps } from '../../Types';
import { createChannel } from '../services/helpers';
import { actionCreators } from '../services/store';
import Gravatar from './Gravatar';
import Icon from './Icon';
import TailStreamer from './TailStreamer';

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

interface HomeChannelProps extends RendererProps {
	user: null | Card;
	actions: typeof actionCreators;
	allChannels: JellyfishState['channels'];
}

interface HomeChannelState {
	showMenu: boolean;
	tail: null | Card[];
}

class HomeChannel extends TailStreamer<HomeChannelProps, HomeChannelState> {
	constructor(props: HomeChannelProps) {
		super(props);

		this.state = {
			showMenu: false,
			tail: null,
		};

		this.streamTail(this.props.channel.data.target);
	}

	public open(card: Card) {
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
		const { allChannels, channel: { data: { head } } } = this.props;
		const { tail } = this.state;

		const activeCard = allChannels.length > 1 ? allChannels[1].data.target : null;

		const email = this.props.user ? this.props.user.data!.email : null;
		const username = this.props.user ? this.props.user.slug!.replace(/user-/, '') : null;

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
							</Link>
						);
					})}
				</Box>
			</Flex>
		);
	}
}

const mapStateToProps = (state: JellyfishState) => ({
	user: state.session ? state.session.user : null,
	allChannels: state.channels,
});

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(HomeChannel);
