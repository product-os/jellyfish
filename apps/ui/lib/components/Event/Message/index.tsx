import { circularDeepEqual } from 'fast-equals';
import classnames from 'classnames';
import _ from 'lodash';
import queryString from 'query-string';
import * as jsonpatch from 'fast-json-patch';
import React from 'react';
import { Box } from 'rendition';
import styled from 'styled-components';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import type {
	Contract,
	TypeContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';
import SmartVisibilitySensor from '../../SmartVisibilitySensor';
import * as helpers from '../../../services/helpers';
import { UserAvatarLive } from '../../UserAvatar';
import Icon from '../../Icon';
import Wrapper from './Wrapper';
import Header from './Header';
import Body, { parseMessage } from './Body';

const MESSAGE_COLLAPSED_HEIGHT = 400;

const EventButton = styled.button<{ openChannel?: boolean }>`
	cursor: ${(props) => {
		return props.openChannel ? 'pointer' : 'default';
	}};
	${(props) => {
		return props.openChannel
			? ''
			: `
		  &:focus {
				outline:0;
			}
		`;
	}}
	border: 0;
	background: transparent;
	display: block;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 4px 8px;
	border-left-style: solid;
	border-left-width: 3px;
	width: 43px;
`;

const MessageIconWrapper = styled(Box)`
	transform: scale(0.8);
	transition: 150ms ease-in-out transform, 150ms ease-in-out filter;
	.event-card:hover & {
		filter: brightness(85%);
		transform: scale(1);
	}
`;

const getTargetId = (card: Contract<{ target: string }>) => {
	return _.get(card, ['data', 'target']) || card.id;
};

interface MessageIconProps {
	firstInThread?: boolean;
	threadColor: string;
}

const MessageIcon: React.FunctionComponent<MessageIconProps> = ({
	firstInThread,
	threadColor,
}) => {
	return (
		<Icon
			style={{
				marginLeft: 6,
				marginTop: 16,
				fontSize: '21px',
				transform: 'scale(1, -1)',
				color: threadColor,
			}}
			name={firstInThread ? 'comment-alt' : 'share'}
		/>
	);
};

interface State {
	editedMessage: string | null;
	updating: boolean;
	messageHeight: number | null;
	isVisible: boolean;
}

interface Props {
	card: Contract<{
		target: string;
		actor: string;
		payload: { message: string };
	}>;
	openChannel?: (targetId: string) => any;
	sdk: JellyfishSDK;
	user: UserContract;
	onUpdateCard: (
		contract: Contract,
		patch: jsonpatch.Operation[],
	) => Promise<any>;
	onCardVisible: (contract: Contract) => any;
	notifications: Contract[];
	types: TypeContract[];
	enableAutocomplete?: boolean;
	sendCommand: string;
	groups: any;
	actor: {
		card: UserContract;
	};
	firstInThread?: boolean;
	menuOptions: any;
	threadIsMirrored: boolean;
	actions: any;
	previousEvent: Contract;
	nextEvent: Contract;
	getActorHref: (actor: UserContract) => string;
}

export default class Event extends React.Component<Props, State> {
	messageElement: HTMLElement | null = null;

	state = {
		editedMessage: null,
		updating: false,
		messageHeight: null,
		isVisible: false,
	};

	handleOpenChannel = () => {
		const { card, openChannel } = this.props;
		if (!openChannel) {
			return;
		}
		const targetId = getTargetId(card);
		openChannel(targetId);
	};

	setMessageElement = (element: HTMLElement | null) => {
		if (element) {
			this.messageElement = element;
			this.setState({
				messageHeight: element.clientHeight,
			});
		}
	};

	onStartEditing = () => {
		this.setState({
			editedMessage: parseMessage(helpers.getMessage(this.props.card)),
		});
	};

	onStopEditing = () => {
		this.setState({
			editedMessage: null,
			updating: false,
		});
	};

	updateEditedMessage = (event: any) => {
		this.setState({
			editedMessage: event.target.value,
		});
	};

	saveEditedMessage = () => {
		const { sdk, user, card, onUpdateCard } = this.props;
		if (this.state.editedMessage === parseMessage(helpers.getMessage(card))) {
			// No change or empty message - just finish editing now
			this.onStopEditing();
		} else {
			this.setState(
				{
					updating: true,
				},
				async () => {
					const { mentionsUser, alertsUser, mentionsGroup, alertsGroup, tags } =
						helpers.getMessageMetaData(this.state.editedMessage!);
					const patch = jsonpatch.compare(
						this.props.card,
						_.defaultsDeep(
							{
								tags,
								data: {
									payload: {
										message: this.state.editedMessage,
										mentionsUser,
										alertsUser,
										mentionsGroup,
										alertsGroup,
									},
								},
							},
							this.props.card,
						),
					);
					onUpdateCard(this.props.card, patch)
						.then(async () => {
							this.onStopEditing();

							// If the edit happens to add a mention of the current user,
							// we need to mark this message as read!
							const updatedCard = await sdk.card.get(card.id);
							if (updatedCard) {
								sdk.card.markAsRead(user.slug, updatedCard as any);
							}
						})
						.catch(() => {
							this.setState({
								updating: false,
							});
						});
				},
			);
		}
	};

	shouldComponentUpdate(nextProps: any, nextState: State) {
		return (
			!circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props)
		);
	}

	handleVisibilityChange = (isVisible: boolean) => {
		const { card } = this.props;

		this.setState({
			isVisible,
		});

		const isMessage = helpers.isTimelineEvent(card.type);

		if (isMessage && isVisible && this.props.onCardVisible) {
			this.props.onCardVisible(this.props.card);
		}
	};

	markNotificationsAsRead() {
		const { notifications, sdk, user } = this.props;

		notifications.map(async (notification: any) => {
			await sdk.card.link(user, notification, 'read');
		});
	}

	componentDidUpdate(prevProps: any, prevState: State) {
		/*
		 * Mark notifications as read if visibility changed or received new notifications
		 */
		if (
			this.state.isVisible &&
			this.props.notifications &&
			this.props.notifications.length &&
			(prevProps.notifications.length !== this.props.notifications.length ||
				!prevState.isVisible)
		) {
			this.markNotificationsAsRead();
		}
	}

	render() {
		const {
			types,
			enableAutocomplete,
			sendCommand,
			user,
			groups,
			card,
			actor,
			sdk,
			firstInThread,
			menuOptions,
			threadIsMirrored,
			openChannel,
			onCardVisible,
			onUpdateCard,
			actions,
			previousEvent,
			nextEvent,
			getActorHref,
			...rest
		} = this.props;

		const { editedMessage, updating } = this.state;

		const typeBase = helpers.getTypeBase(card.type);
		const isMessage = helpers.isTimelineEvent(typeBase);

		const messageOverflows =
			this.state.messageHeight! >= MESSAGE_COLLAPSED_HEIGHT;
		const threadColor = helpers.colorHash(getTargetId(card));

		// Squash the top of the message if the previous event has the same target
		// and actor
		const squashTop =
			previousEvent &&
			previousEvent.type === card.type &&
			previousEvent.data.target === card.data.target &&
			previousEvent.data.actor === card.data.actor;

		// Squash the bottom of the message if the next event has the same target
		// and actor
		const squashBottom =
			nextEvent &&
			nextEvent.type === card.type &&
			nextEvent.data.target === card.data.target &&
			nextEvent.data.actor === card.data.actor;

		const { event: focusedEvent } = queryString.parse(
			_.get(window.location, ['search'], ''),
		);

		return (
			<SmartVisibilitySensor onChange={this.handleVisibilityChange}>
				<Wrapper
					{...rest}
					// @ts-ignore
					squashTop={squashTop}
					className={classnames(`event-card event-card--${typeBase}`, {
						'event--focused': focusedEvent && focusedEvent === card.id,
					})}
					id={`event-${card.id}`}
				>
					<EventButton
						openChannel={!!openChannel}
						onClick={this.handleOpenChannel}
						style={{
							borderLeftColor: threadColor,
						}}
					>
						{!squashTop && (
							<React.Fragment>
								<UserAvatarLive userId={helpers.getActorIdFromCard(card)} />
								{openChannel && (
									<MessageIconWrapper
										tooltip={{
											placement: 'bottom',
											text: `Open ${card.type.split('@')[0]}`,
										}}
									>
										<MessageIcon
											threadColor={threadColor}
											firstInThread={firstInThread}
										/>
									</MessageIconWrapper>
								)}
							</React.Fragment>
						)}
					</EventButton>
					<Box
						pt={squashTop ? 0 : 1}
						pb={squashBottom ? 0 : 1}
						flex="1"
						style={{
							minWidth: 0,
						}}
					>
						<Header
							actor={actor}
							card={card}
							threadIsMirrored={threadIsMirrored}
							menuOptions={menuOptions}
							isMessage={isMessage}
							onEditMessage={this.onStartEditing}
							onCommitEdit={this.saveEditedMessage}
							onCancelEdit={this.onStopEditing}
							updating={updating}
							editing={editedMessage !== null}
							user={user}
							squashTop={squashTop}
							getActorHref={getActorHref}
						/>
						<Body
							actor={actor}
							card={card}
							editedMessage={editedMessage}
							enableAutocomplete={enableAutocomplete}
							groups={groups}
							isMessage={isMessage}
							messageCollapsedHeight={MESSAGE_COLLAPSED_HEIGHT}
							messageOverflows={messageOverflows}
							onSaveEditedMessage={this.saveEditedMessage}
							onUpdateDraft={this.updateEditedMessage}
							sdk={sdk}
							sendCommand={sendCommand}
							setMessageElement={this.setMessageElement}
							squashBottom={squashBottom}
							squashTop={squashTop}
							types={types}
							updating={updating}
							user={user}
						/>
					</Box>
				</Wrapper>
			</SmartVisibilitySensor>
		);
	}
}
