import _ from 'lodash';
import path from 'path';
import React from 'react';
import { connect } from 'react-redux';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import ReactResizeObserver from 'react-resize-observer';
import { compose } from 'redux';
import { Box, Flex } from 'rendition';
import {
	Event,
	EventsContainer,
	Icon,
	withDefaultGetActorHref,
} from '@balena/jellyfish-ui-components';
import { sdk, selectors } from '../../core';
import { withChannelContext } from '../../hooks';
import type { LensContract, LensRendererProps } from '../../types';
import type {
	Contract,
	TypeContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';

const NONE_MESSAGE_TIMELINE_TYPES = [
	'create',
	'event',
	'update',
	'create@1.0.0',
	'event@1.0.0',
	'update@1.0.0',
	'thread@1.0.0',
];

const isHiddenEventType = (type) => {
	return _.includes(NONE_MESSAGE_TIMELINE_TYPES, type);
};

// TODO: remove once we can retrieve this data during query
const isFirstInThread = (card, firstMessagesByThreads) => {
	const target = _.get(card, ['data', 'target']);
	const firstInThread = firstMessagesByThreads[target];
	if (!firstInThread) {
		firstMessagesByThreads[target] = card;
		return true;
	}
	return false;
};

interface StateProps {
	types: TypeContract[];
	groups: Contract[];
	user: UserContract;
}

type OwnProps = LensRendererProps;

type Props = RouteComponentProps &
	OwnProps &
	StateProps & {
		// From `withDefaultGetActorHref`
		getActorHref: (actor: any) => string;
	};

interface State {
	newMessage: string;
	showNewCardModal: boolean;
	messagesOnly: boolean;
	loadingPage: boolean;
}

export class Interleaved extends React.Component<Props, State> {
	shouldScroll: boolean = true;
	loadingPage: boolean = false;
	scrollBottomOffset: number = 0;
	scrollArea: HTMLDivElement | undefined;

	constructor(props: Props) {
		super(props);

		this.state = {
			newMessage: '',
			showNewCardModal: false,
			messagesOnly: true,
			loadingPage: false,
		};

		setTimeout(() => {
			return this.scrollToBottom();
		});
	}

	scrollToBottom = () => {
		if (!this.scrollArea) {
			return;
		}
		if (this.shouldScroll) {
			this.scrollArea.scrollTop = this.scrollArea.scrollHeight;
		}
	};

	openChannel = (target: string) => {
		// Remove everything after the current channel, then append the target.
		const current = this.props.channel.data.target;
		this.props.history.push(
			path.join(window.location.pathname.split(current)[0], current, target),
		);
	};

	handleEventToggle = () => {
		this.setState({
			messagesOnly: !this.state.messagesOnly,
		});
	};

	handleScroll = async () => {
		const { scrollArea, loadingPage } = this;
		if (!scrollArea) {
			return;
		}
		this.scrollBottomOffset =
			scrollArea.scrollHeight -
			(scrollArea.scrollTop + scrollArea.offsetHeight);
		if (loadingPage) {
			return;
		}
		if (scrollArea.scrollTop > 200) {
			return;
		}
		this.loadingPage = true;
		await this.props.setPage(this.props.page + 1);
		this.loadingPage = false;
	};

	getSnapshotBeforeUpdate() {
		if (this.scrollArea) {
			// Only set the scroll flag if the scroll area is already at the bottom
			this.shouldScroll =
				this.scrollArea.scrollTop >=
				this.scrollArea.scrollHeight - this.scrollArea.offsetHeight;
		}

		return null;
	}

	componentDidUpdate(prevProps: Props) {
		// Scroll to bottom if the component has been updated with new items
		this.scrollToBottom();
		if (
			prevProps.tail &&
			this.props.tail &&
			prevProps.tail.length !== this.props.tail.length
		) {
			window.requestAnimationFrame(() => {
				const { scrollArea } = this;
				if (!scrollArea) {
					return;
				}
				scrollArea.scrollTop =
					scrollArea.scrollHeight -
					this.scrollBottomOffset -
					scrollArea.offsetHeight;
			});
		}
	}

	handleCardVisible = (contract: Contract) => {
		sdk.card
			.markAsRead(
				this.props.user.slug,
				contract as any,
				_.map(_.filter(this.props.groups, 'isMine'), 'name') as string[],
			)
			.catch((error) => {
				console.error(error);
			});
	};

	bindScrollArea = (ref: HTMLDivElement) => {
		this.scrollArea = ref;
	};

	render() {
		const { messagesOnly } = this.state;

		let tail = this.props.tail ? this.props.tail.slice() : null;
		const firstMessagesByThreads = {};

		// If tail has expanded links, interleave them in with the head cards
		if (tail !== null) {
			for (const card of tail) {
				if (card.links) {
					for (const verb of Object.keys(card.links)) {
						for (const item of card.links[verb]) {
							tail.push(item);
						}
					}
				}
			}
		}

		tail = _.sortBy(tail, 'created_at');

		return (
			<Flex
				flexDirection="column"
				flex="1"
				style={{
					overflowY: 'auto',
					position: 'relative',
				}}
			>
				<ReactResizeObserver onResize={this.scrollToBottom} />
				<EventsContainer ref={this.bindScrollArea} onScroll={this.handleScroll}>
					{this.props.totalPages > this.props.page + 1 && (
						<Box p={3}>
							<Icon spin name="cog" />
						</Box>
					)}

					{tail !== null &&
						tail.length > 0 &&
						tail.map((card, index: any) => {
							if (messagesOnly && isHiddenEventType(card.type)) {
								return null;
							}
							return (
								<Box key={card.id}>
									<Event
										previousEvent={tail![index - 1]}
										nextEvent={tail![index + 1]}
										onCardVisible={this.handleCardVisible}
										openChannel={this.openChannel}
										user={this.props.user}
										groups={this.props.groups}
										card={card}
										firstInThread={isFirstInThread(
											card,
											firstMessagesByThreads,
										)}
										getActorHref={this.props.getActorHref}
									/>
								</Box>
							);
						})}
				</EventsContainer>
			</Flex>
		);
	}
}

const mapStateToProps = (state): StateProps => {
	return {
		types: selectors.getTypes(state),
		groups: selectors.getGroups(state),
		user: selectors.getCurrentUser(state),
	};
};

const lens: LensContract = {
	slug: 'lens-interleaved',
	type: 'lens',
	version: '1.0.0',
	name: 'Interleaved lens',
	data: {
		label: 'Interleaved',
		icon: 'list',
		format: 'list',
		renderer: compose<React.ComponentType<LensRendererProps>>(
			withRouter,
			withChannelContext,
			withDefaultGetActorHref(),
			connect<StateProps, {}, OwnProps>(mapStateToProps),
		)(Interleaved),
		filter: {
			type: 'array',
			oneOf: [
				{
					items: {
						type: 'object',
						required: ['id', 'type', 'slug'],
						properties: {
							id: {
								type: 'string',
							},
							slug: {
								type: 'string',
							},
							type: {
								type: 'string',
								const: 'thread@1.0.0',
							},
						},
					},
				},
				{
					items: {
						type: 'object',
						required: ['id', 'type', 'data'],
						properties: {
							id: {
								type: 'string',
							},
							slug: {
								type: 'string',
							},
							type: {
								type: 'string',
								const: 'message@1.0.0',
							},
							data: {
								type: 'object',
								properties: {
									timestamp: {
										type: 'string',
										format: 'date-time',
									},
									actor: {
										type: 'string',
										format: 'uuid',
									},
									payload: {
										type: 'object',
										properties: {
											message: {
												type: 'string',
											},
										},
									},
								},
								required: ['timestamp', 'actor', 'payload'],
							},
						},
					},
				},
			],
		},
		queryOptions: {
			limit: 30,
			sortBy: 'created_at',
			sortDir: 'desc',

			// The interleaved lens is interested in messages that are attached to the
			// main query resource. Here we invert the query so that we retrieve all
			// the messages attached to the main queried resource
			mask: (query) => {
				return {
					type: 'object',
					$$links: {
						'is attached to': query,
					},
					properties: {
						active: {
							const: true,
							type: 'boolean',
						},
						type: {
							type: 'string',
							const: 'message@1.0.0',
						},
					},
					required: ['active', 'type'],
					additionalProperties: true,
				};
			},
		},
	},
};

export default lens;
