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
	Text,
} from 'rendition';
import styled from 'styled-components';
import { Card, JellyfishState, RendererProps } from '../../Types';
import { createChannel } from '../services/helpers';
import { queryView } from '../services/sdk';
import { actionCreators } from '../services/store';
import Gravatar from './Gravatar';
import Icon from './Icon';

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
}

interface HomeChannelState {
	showMenu: boolean;
	tail: null | Card[];
}

class HomeChannel extends React.Component<HomeChannelProps, HomeChannelState> {
	constructor(props: HomeChannelProps) {
		super(props);

		this.state = {
			showMenu: false,
			tail: null,
		};

		this.loadTail();
	}

	public loadTail() {
		queryView(this.props.channel.data.target)
		.then((tail) => this.setState({ tail }));
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
		const { head } = this.props.channel.data;
		const { tail } = this.state;

		const email = this.props.user ? this.props.user.data!.email : null;
		const username = this.props.user ? this.props.user.slug!.replace(/user-/, '') : null;

		if (!head) {
			return <Icon style={{color: 'white'}} name='cog fa-spin' />;
		}

		return (
			<Flex flexDirection='column'
				style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #ccc', minWidth: 270 }}>
				<Flex
					bg='#333'
					align='center'
					color='white'
					px={3}
					py={18}
					style={{ cursor: 'pointer'}}
					onClick={() => this.setState({ showMenu: true })}>
					<Gravatar email={email} />
					{!!username && <Text mx={3}>{username}</Text>}
					<Icon name='caret-down' />
				</Flex>

				<Divider color='#ccc' m={0} />

				{this.state.showMenu &&
					<Fixed z={9999999} onClick={() => this.setState({ showMenu: false })}>
						<MenuPanel mx={3} p={3}>
							<Button plaintext onClick={() => this.logout()}>Log out</Button>
						</MenuPanel>
					</Fixed>
				}

				<Box flex='1' p={3} bg='#333'>
					{!tail && <Icon style={{color: 'white'}} name='cog fa-spin' />}

					{!!tail && _.map(tail, (card) => {
						// A view shouldn't be able to display itself
						if (card.id === head!.id) {
							return null;
						}

						return (
							<Box key={card.id} mb={3}>
								<Link color='white' onClick={() => this.open(card)}>{card.name}</Link>
							</Box>
						);
					})}
				</Box>
			</Flex>
		);
	}
}

const mapStateToProps = (state: JellyfishState) => ({
	user: state.session ? state.session.user : null,
});

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(HomeChannel);
