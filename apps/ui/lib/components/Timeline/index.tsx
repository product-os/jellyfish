import * as Bluebird from 'bluebird';
import _ from 'lodash';
import React from 'react';
import queryString from 'query-string';
import { v4 as uuid } from 'uuid';
import * as helpers from '../../services/helpers';
import Column from '../Column';
import MessageInput, { messageSymbolRE } from './MessageInput';
import { withSetup, Setup } from '../SetupProvider';
import Header from './Header';
import EventsList from './EventsList';
import TypingNotice from './TypingNotice';
import { addNotification } from '../../services/notifications';
import { UPDATE, CREATE } from '../constants';
import type {
	Contract,
	TypeContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';

const PAGE_SIZE = 20;

export { MessageInput };

/*
 * This message text is used when uploading a file so that syncing can be done
 * effectively without have to sync the entire file
 */
export const HIDDEN_ANCHOR = '#jellyfish-hidden';
export const FILE_PROXY_MESSAGE = `[](${HIDDEN_ANCHOR})A file has been uploaded using Jellyfish:`;

const getSendCommand = (user: UserContract) => {
	return _.get(user.data, ['profile', 'sendCommand'], 'shift+enter');
};

const getFreshPendingMessages = (tail: any[], pendingMessages: any[]) => {
	return _.filter(pendingMessages, (pending) => {
		return !_.find(tail, ['slug', pending.slug]);
	});
};

interface TimelineProps extends Setup {
	allowWhispers: boolean;
	card: Contract;
	enableAutocomplete?: boolean;
	eventMenuOptions: any;
	getActor: (idOrSlug: string) => Promise<any>;
	getActorHref?: (actor: any) => string;
	groups: { [k: string]: any };
	headerOptions: any;
	next: () => Promise<Contract[]>;
	notifications: any;
	setTimelineMessage: (id: string, message: string) => void;
	signalTyping: (id: string) => void;
	tail: Contract[];
	timelineMessage?: string;
	types: TypeContract[];
	user: UserContract;
	usersTyping: any;
	wide: boolean;
}

class Timeline extends React.Component<TimelineProps, any> {
	eventListRef: any;
	retrieveFullTimelime: any;
	signalTyping: any;
	preserveMessage: any;

	constructor(props: any) {
		super(props);
		this.state = {
			hideWhispers: false,
			messageSymbol: false,
			messagesOnly: true,
			pendingMessages: [],
			showNewCardModal: false,
			uploadingFiles: [],
			reachedBeginningOfTimeline: this.props.tail.length < PAGE_SIZE,
			loadingMoreEvents: false,
			ready: false,
		};

		this.eventListRef = React.createRef();
		this.scrollToEvent = this.scrollToEvent.bind(this);
		this.handleScrollBeginning = this.handleScrollBeginning.bind(this);
		this.retrieveFullTimelime = this.retrieveFullTimeline.bind(this);
		this.addMessage = this.addMessage.bind(this);
		this.handleCardVisible = this.handleCardVisible.bind(this);
		this.handleFileChange = this.handleFileChange.bind(this);
		this.handleEventToggle = this.handleEventToggle.bind(this);
		this.handleJumpToTop = this.handleJumpToTop.bind(this);
		this.handleWhisperToggle = this.handleWhisperToggle.bind(this);

		this.signalTyping = _.throttle(() => {
			this.props.signalTyping(this.props.card.id);
		}, 1500);

		this.preserveMessage = (newMessage: any) => {
			this.props.setTimelineMessage(this.props.card.id, newMessage);
		};
	}

	async componentDidMount() {
		const { event } = queryString.parse(window.location.search);

		// Timeout required to ensure the timeline has loaded before we scroll to the bottom
		// @ts-ignore
		await Bluebird.delay(2000);
		if (event) {
			this.scrollToEvent(event);
		} else {
			this.eventListRef.current.scrollToBottom();
		}

		// Timeout to ensure scroll has finished
		// @ts-ignore
		await Bluebird.delay(500);
		this.setState({
			ready: true,
		});
	}

	getSnapshotBeforeUpdate(prevProps: any) {
		const snapshot: any = {};
		if (
			_.get(this.props, ['tail', 'length'], 0) >
			_.get(prevProps, ['tail', 'length'], 0)
		) {
			snapshot.wasAtBottomOfTimeline =
				this.eventListRef.current.isScrolledToBottom();
		}
		return snapshot;
	}

	componentDidUpdate(prevProps: any, _prevState: any, snapshot: any) {
		const { pendingMessages } = this.state;
		const { tail } = this.props;

		const newMessages = tail.length > prevProps.tail.length;

		if (newMessages) {
			this.setState(
				{
					pendingMessages: newMessages
						? getFreshPendingMessages(tail, pendingMessages)
						: pendingMessages,
				},
				() => {
					if (snapshot.wasAtBottomOfTimeline) {
						this.eventListRef.current.scrollToBottom();
					}
				},
			);
		}
	}

	async scrollToEvent(eventId: any) {
		const { tail } = this.props;
		const { reachedBeginningOfTimeline } = this.state;
		const existing = _.find(tail, {
			id: eventId,
		});
		if (existing) {
			const pureType = existing.type.split('@')[0];
			if (pureType === UPDATE || pureType === CREATE) {
				this.handleEventToggle();
			}
			const messageElement = document.getElementById(`event-${eventId}`);
			if (messageElement) {
				messageElement.scrollIntoView({
					behavior: 'smooth',
				});
			}
		} else if (!reachedBeginningOfTimeline) {
			await this.retrieveFullTimeline();
			this.scrollToEvent(eventId);
		}
	}

	handleScrollBeginning() {
		if (this.state.reachedBeginningOfTimeline) {
			return;
		}

		this.setState(
			{
				loadingMoreEvents: true,
			},
			() => {
				return this.props.next().then((newEvents: any[]) => {
					const receivedNewEvents = newEvents.length > 0;
					this.setState({
						loadingMoreEvents: false,
						reachedBeginningOfTimeline: !receivedNewEvents,
					});
				});
			},
		);
	}

	async handleJumpToTop() {
		const options = {
			behaviour: 'smooth',
		};

		if (this.state.reachedBeginningOfTimeline) {
			this.eventListRef.current.scrollToTop(options);
		} else {
			await this.retrieveFullTimeline();
			this.eventListRef.current.scrollToTop(options);
		}
	}

	async retrieveFullTimeline() {
		while (true) {
			const newEvents = await this.props.next();

			if (newEvents.length) {
				continue;
			}

			return new Promise<void>((resolve) => {
				this.setState(
					{
						reachedBeginningOfTimeline: true,
					},
					resolve,
				);
			});
		}
	}

	handleEventToggle() {
		this.setState({
			messagesOnly: !this.state.messagesOnly,
		});
	}

	handleWhisperToggle() {
		this.setState({
			hideWhispers: !this.state.hideWhispers,
		});
	}

	handleFileChange(files: any, whisper: any) {
		const type = whisper ? 'whisper' : 'message';
		if (!files || !files.length) {
			return;
		}
		const file = _.first(files);
		const message = {
			target: this.props.card,
			tags: [],
			type,
			slug: `${type}-${uuid()}`,
			payload: {
				file,
				message: `${FILE_PROXY_MESSAGE} ${helpers.createPermaLink(
					this.props.card,
				)}`,
			},
		};

		this.setState({
			uploadingFiles: this.state.uploadingFiles.concat(message.slug),
		});

		this.props.sdk.event
			.create(message)
			.then(() => {
				this.props.analytics.track('element.create', {
					element: {
						type,
					},
				});
			})
			.catch((error: any) => {
				addNotification('danger', error.message || error);
			})
			.finally(() => {
				this.setState({
					uploadingFiles: _.without(this.state.uploadingFiles, message.slug),
				});
			});
	}

	handleCardVisible(card: any) {
		this.props.sdk.card
			.markAsRead(
				this.props.user.slug,
				card,
				_.map(_.filter(this.props.groups, 'isMine'), 'name'),
			)
			.catch((error: any) => {
				console.error(error);
			});
	}

	addMessage(newMessage: string, whisper: any) {
		const trimmedMessage = newMessage.trim();
		if (!trimmedMessage) {
			return;
		}
		this.props.setTimelineMessage(this.props.card.id, '');
		const { mentionsUser, alertsUser, mentionsGroup, alertsGroup, tags } =
			helpers.getMessageMetaData(trimmedMessage);
		const message = {
			target: this.props.card,
			type: whisper ? 'whisper' : 'message',
			slug: `${whisper ? 'whisper' : 'message'}-${uuid()}`,
			tags,
			payload: {
				mentionsUser,
				alertsUser,
				mentionsGroup,
				alertsGroup,
				message: helpers.replaceEmoji(
					trimmedMessage.replace(messageSymbolRE, ''),
				),
			},
		};

		// Synthesize the event card and add it to the pending messages so it can be
		// rendered in advance of the API request completing it
		this.setState(
			{
				pendingMessages: this.state.pendingMessages.concat({
					pending: true,
					type: message.type,
					tags,
					slug: message.slug,
					data: {
						actor: this.props.user.id,
						payload: message.payload,
						target: this.props.card.id,
					},
				}),
			},
			() => {
				this.eventListRef.current.scrollToBottom();
			},
		);

		this.props.sdk.event
			.create(message)
			.then(() => {
				this.props.analytics.track('element.create', {
					element: {
						type: message.type,
					},
				});
			})
			.catch((error: any) => {
				addNotification('danger', error.message || error);
			});
	}

	render() {
		const {
			user,
			card,
			getActor,
			enableAutocomplete,
			eventMenuOptions,
			sdk,
			types,
			groups,
			allowWhispers,
			usersTyping,
			timelineMessage,
			wide,
			headerOptions,
			getActorHref,
			tail,
			notifications,
		} = this.props;
		const {
			messagesOnly,
			pendingMessages,
			hideWhispers,
			loadingMoreEvents,
			ready,
			uploadingFiles,
			reachedBeginningOfTimeline,
		} = this.state;

		// Due to a bug in syncing, sometimes there can be duplicate cards in events
		const sortedEvents = _.uniqBy(
			_.sortBy(tail, (event) => {
				return _.get(event, ['data', 'timestamp']) || event.created_at;
			}),
			'id',
		);

		const sendCommand = getSendCommand(user);

		const isMirrored = !_.isEmpty(_.get(card, ['data', 'mirrors']));

		const eventProps = {
			types,
			groups,
			enableAutocomplete,
			sendCommand,
			onCardVisible: this.handleCardVisible,
			notifications,
			user,
			threadIsMirrored: isMirrored,
			menuOptions: eventMenuOptions,
			getActorHref,
			targetCard: card,
		};

		return (
			<Column>
				<Header
					headerOptions={headerOptions}
					hideWhispers={hideWhispers}
					messagesOnly={messagesOnly}
					sortedEvents={sortedEvents}
					handleJumpToTop={this.handleJumpToTop}
					handleWhisperToggle={this.handleWhisperToggle}
					handleEventToggle={this.handleEventToggle}
					card={card}
					getActor={getActor}
				/>

				<EventsList
					{...eventProps}
					ref={this.eventListRef}
					user={user}
					hideWhispers={hideWhispers}
					sortedEvents={sortedEvents}
					uploadingFiles={uploadingFiles}
					messagesOnly={messagesOnly}
					loading={!ready || loadingMoreEvents}
					onScrollBeginning={this.handleScrollBeginning}
					pendingMessages={pendingMessages}
					reachedBeginningOfTimeline={reachedBeginningOfTimeline}
				/>

				<TypingNotice usersTyping={usersTyping} />

				<MessageInput
					enableAutocomplete={enableAutocomplete}
					sdk={sdk}
					types={types}
					user={user}
					wide={wide}
					style={{
						borderTop: '1px solid #eee',
					}}
					allowWhispers={allowWhispers}
					sendCommand={sendCommand}
					value={timelineMessage}
					signalTyping={this.signalTyping}
					preserveMessage={this.preserveMessage}
					onSubmit={this.addMessage}
					onFileChange={this.handleFileChange}
				/>
			</Column>
		);
	}
}

export default withSetup<TimelineProps>(Timeline);
