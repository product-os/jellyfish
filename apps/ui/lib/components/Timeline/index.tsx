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
import { JsonSchema } from '@balena/jellyfish-types';
import { JellyfishCursor } from '@balena/jellyfish-client-sdk/build/cursor';

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
		return pending && !_.find(tail, ['slug', pending.slug]);
	});
};

export interface Props extends Setup {
	allowWhispers: boolean;
	card: Contract;
	enableAutocomplete?: boolean;
	eventMenuOptions: any;
	getActor: (idOrSlug: string) => Promise<any>;
	getActorHref?: (actor: any) => string;
	groups: { [k: string]: any };
	headerOptions: any;
	notifications: any;
	setTimelineMessage: (id: string, message: string) => void;
	setTimelinePendingMessages: (id: string, message: any[]) => void;
	signalTyping: (id: string) => void;
	tail: Contract[];
	timelineMessage?: string;
	timelinePendingMessages?: any[];
	types: TypeContract[];
	user: UserContract;
	usersTyping: any;
	wide: boolean;
}

type PendingMessage = Pick<Contract, 'type' | 'tags' | 'slug' | 'data'> & {
	pending: boolean;
	created_at: string;
	data: {
		actor: string;
		payload: any;
		target: string;
	};
};

interface State {
	pendingMessages: PendingMessage[];
	results: Contract[];
	hasNextPage: boolean;
	hideWhispers: boolean;
	messageSymbol: boolean;
	messagesOnly: boolean;
	uploadingFiles: string[];
	loadingMoreEvents: boolean;
	ready: boolean;
}

class Timeline extends React.Component<Props, State> {
	cursor: JellyfishCursor | null = null;
	eventListRef: React.RefObject<any>;

	constructor(props: Props) {
		super(props);
		this.state = {
			results: [],
			hasNextPage: true,
			hideWhispers: false,
			messageSymbol: false,
			messagesOnly: true,
			pendingMessages: this.props.timelinePendingMessages || [],
			uploadingFiles: [],
			loadingMoreEvents: false,
			ready: false,
		};

		this.eventListRef = React.createRef();
		this.scrollToEvent = this.scrollToEvent.bind(this);
		this.handleScrollBeginning = this.handleScrollBeginning.bind(this);
		this.addMessage = this.addMessage.bind(this);
		this.handleCardVisible = this.handleCardVisible.bind(this);
		this.handleFileChange = this.handleFileChange.bind(this);
		this.handleEventToggle = this.handleEventToggle.bind(this);
		this.handleJumpToTop = this.handleJumpToTop.bind(this);
		this.handleWhisperToggle = this.handleWhisperToggle.bind(this);
	}

	async componentDidMount() {
		const query = this.getTimelineQuery();
		const cursor = this.props.sdk.getCursor(query, {
			sortBy: ['data', 'timestamp'],
			sortDir: 'desc',
		});
		this.cursor = cursor;
		const results = await cursor.query();
		this.setState({
			hasNextPage: cursor.hasNextPage(),
			results,
		});

		// TS-TODO: Fix typings for event listeners on cursor
		cursor.onUpdate(((response: {
			data: { type: any; id: any; after: any };
		}) => {
			const { id, after } = response.data;

			// If card is null then it has been set to inactive or deleted
			if (after === null) {
				this.setState((prevState) => {
					return {
						results: prevState.results.filter((contract) => contract.id !== id),
					};
				});
				return;
			}

			// Otherwise perform an upsert
			this.setState((prevState) => {
				const index = _.findIndex(prevState.results, { id });
				// If an item is found then replace it
				if (index > -1 && prevState.results) {
					prevState.results.splice(index, 1, after);
					return {
						results: prevState.results,
					};
				}
				// Otherwise add it to the results
				return {
					results: prevState.results
						? prevState.results.concat(after)
						: [after],
				};
			});
		}) as any);

		const { event } = queryString.parse(window.location.search);

		if (event) {
			this.scrollToEvent(event);
		} else {
			this.eventListRef.current.scrollToBottom();
		}

		this.setState({
			ready: true,
		});
	}

	componentWillUnmount() {
		if (this.cursor) {
			this.cursor.close();
		}
	}

	signalTyping = _.throttle(() => {
		this.props.signalTyping(this.props.card.id);
	}, 1500);

	preserveMessage = (newMessage: any) => {
		this.props.setTimelineMessage(this.props.card.id, newMessage);
	};

	getTimelineQuery() {
		const { card } = this.props;
		const query: JsonSchema = {
			$$links: {
				'is attached to': {
					type: 'object',
					properties: {
						id: {
							const: card.id,
						},
					},
				},
			},
			type: 'object',
			properties: {
				type: {
					type: 'string',
					enum: [
						'message@1.0.0',
						'whisper@1.0.0',
						'create@1.0.0',
						'update@1.0.0',
						'summary@1.0.0',
					],
				},
			},
		};
		return query;
	}

	getSnapshotBeforeUpdate() {
		const snapshot: any = {};
		snapshot.wasAtBottomOfTimeline =
			this.eventListRef.current.isScrolledToBottom();
		snapshot.scrollBottom = this.eventListRef.current.getScrollBottom();
		return snapshot;
	}

	componentDidUpdate(_prevProps, prevState, snapshot) {
		const { pendingMessages, results } = this.state;

		const newMessages = results.length > prevState.results.length;

		if (newMessages) {
			const newPendingMessages = newMessages
				? getFreshPendingMessages(results, pendingMessages)
				: pendingMessages;
			this.props.setTimelinePendingMessages(
				this.props.card.id,
				newPendingMessages,
			);
			this.setState(
				{
					pendingMessages: newPendingMessages,
				},
				() => {
					// If the timeline was previously scrolled to the bottom, keep it "stuck" at the bottom.
					// Otherwise, scroll to the previous bottom offset, so that the timeline doesn't "jump" upwards
					if (snapshot.wasAtBottomOfTimeline) {
						this.eventListRef.current.scrollToBottom();
					} else {
						this.eventListRef.current.setScrollBottom(snapshot.scrollBottom);
					}
				},
			);
		}
	}

	async scrollToEvent(eventId: any) {
		const { hasNextPage, results } = this.state;
		const existing = _.find(results, {
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
		} else if (hasNextPage) {
			await this.retrieveFullTimeline();
			this.scrollToEvent(eventId);
		}
	}

	handleScrollBeginning() {
		if (!this.state.ready) {
			return;
		}
		if (!this.state.hasNextPage) {
			return;
		}

		this.setState(
			{
				loadingMoreEvents: true,
			},
			async () => {
				if (this.cursor && this.cursor.hasNextPage()) {
					const results = await this.cursor.nextPage();
					const hasNextPage = this.cursor.hasNextPage();
					this.setState((prevState) => {
						return {
							results: prevState.results.concat(results),
							loadingMoreEvents: false,
							hasNextPage,
						};
					});
				}
			},
		);
	}

	async handleJumpToTop() {
		const options = {
			behaviour: 'smooth',
		};

		if (this.state.hasNextPage) {
			this.eventListRef.current.scrollToTop(options);
		} else {
			await this.retrieveFullTimeline();
			this.eventListRef.current.scrollToTop(options);
		}
	}

	retrieveFullTimeline = async () => {
		let fullResults: Contract[] = [];
		const { card } = this.props;
		const limit = 500;
		let skip = 0;

		this.setState({
			hasNextPage: false,
		});

		while (true) {
			const query = this.getTimelineQuery();
			const results = await this.props.sdk.query(query, {
				sortBy: ['data', 'timestamp'],
				sortDir: 'desc',
				limit,
				skip,
			});

			fullResults = fullResults.concat(results);
			if (results.length < limit) {
				break;
			}
			skip = skip + limit;
		}

		this.setState({
			results: fullResults,
		});
	};

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

	sendMessage(message: any) {
		const oldPendingMessages = this.state.pendingMessages.filter(
			(m) => m && m.slug !== message.slug,
		);
		// Synthesize the event card and add it to the pending messages so it can be
		// rendered in advance of the API request completing it
		const pendingMessages = oldPendingMessages.concat({
			pending: true,
			created_at: new Date().toISOString(),
			type: message.type,
			tags: message.tags,
			slug: message.slug,
			data: {
				actor: this.props.user.id,
				payload: message.data.payload,
				target: this.props.card.id,
			},
		});
		this.props.setTimelinePendingMessages(this.props.card.id, pendingMessages);
		this.setState(
			{
				pendingMessages,
			},
			() => {
				this.eventListRef.current.scrollToBottom();
			},
		);

		this.props.sdk.event
			.create({
				type: message.type,
				slug: message.slug,
				tags: message.tags,
				target: this.props.card,
				payload: message.data.payload,
			})
			.then(() => {
				this.props.analytics.track('element.create', {
					element: {
						type: message.type,
					},
				});
			})
			.catch((error: any) => {
				console.error(error);
				addNotification('danger', error.message || error);
				const newPendingMessages: any[] = _.map(
					this.state.pendingMessages,
					(item: any) => {
						if (item.slug === message.slug) {
							item.error = error;
						}
						return item;
					},
				);
				this.props.setTimelinePendingMessages(
					this.props.card.id,
					newPendingMessages,
				);
				this.setState({ pendingMessages: newPendingMessages });
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
			type: whisper ? 'whisper' : 'message',
			slug: `${whisper ? 'whisper' : 'message'}-${uuid()}`,
			tags,
			data: {
				payload: {
					mentionsUser,
					alertsUser,
					mentionsGroup,
					alertsGroup,
					message: helpers.replaceEmoji(
						trimmedMessage.replace(messageSymbolRE, ''),
					),
				},
			},
		};

		this.sendMessage(message);
	}

	retrySendMessage = (message: any) => {
		this.sendMessage(message);
	};

	render() {
		const {
			user,
			card,
			getActor,
			enableAutocomplete,
			eventMenuOptions,
			types,
			groups,
			allowWhispers,
			usersTyping,
			timelineMessage,
			wide,
			headerOptions,
			getActorHref,
			notifications,
		} = this.props;
		const {
			messagesOnly,
			pendingMessages,
			hideWhispers,
			loadingMoreEvents,
			ready,
			uploadingFiles,
			hasNextPage,
			results,
		} = this.state;

		// Due to a bug in syncing, sometimes there can be duplicate cards in events
		const sortedEvents = _.sortBy(results || [], (event) => {
			return _.get(event, ['data', 'timestamp']) || event.created_at;
		});

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
					reachedBeginningOfTimeline={!hasNextPage}
					retry={this.retrySendMessage}
				/>

				<TypingNotice usersTyping={usersTyping} />

				<MessageInput
					enableAutocomplete={enableAutocomplete}
					sdk={this.props.sdk}
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

export default withSetup<Props>(Timeline);
