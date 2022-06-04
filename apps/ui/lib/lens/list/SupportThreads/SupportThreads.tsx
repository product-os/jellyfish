import Bluebird from 'bluebird';
import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import * as React from 'react';
import styled from 'styled-components';
import { addBusinessDays, isAfter } from 'date-fns';
import { Box, Tab, Tabs, Txt } from 'rendition';
import {
	CardChatSummary,
	Column,
	Icon,
	InfiniteList,
} from '../../../components';
import * as helpers from '../../../services/helpers';
import { UserContract } from '@balena/jellyfish-types/build/core';

const StyledTabs = styled(Tabs)`
	flex: 1 > [role= 'tabpanel' ] {
		flex: 1;
	}
`;

export const SLUG = 'lens-support-threads';

// This name is added to update events that reopen issues/pull requests
const THREAD_REOPEN_NAME_RE =
	/Support Thread re-opened because linked (Issue|Pull Request) was closed/;

// One day in milliseconds
const ENGINEER_RESPONSE_TIMEOUT = 1000 * 60 * 60 * 24;

// Three (business) days
const USER_RESPONSE_TIMEOUT_DAYS = 3;

const timestampSort = (cards) => {
	return _.sortBy(cards, (element) => {
		const timestamps = _.map(
			_.get(element.links, ['has attached element'], []),
			'data.timestamp',
		);
		timestamps.sort();
		return _.last(timestamps);
	}).reverse();
};

export default class SupportThreads extends React.Component<any, any> {
	handleScrollEnding;

	constructor(props) {
		super(props);

		this.state = {
			newMessage: '',
			showNewCardModal: false,
			segments: [],
		};

		this.handleScrollEnding = async () => {
			await this.props.nextPage();
		};

		this.setActiveIndex = this.setActiveIndex.bind(this);
	}

	shouldComponentUpdate(nextProps, nextState) {
		return (
			!circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props)
		);
	}

	componentDidMount() {
		this.generateSegments();
	}

	componentDidUpdate(prevProps) {
		if (!circularDeepEqual(this.props.tail, prevProps.tail)) {
			this.generateSegments();
		}
	}

	async generateSegments() {
		const tail = timestampSort(this.props.tail.slice());

		const pendingAgentResponse: any = [];
		const pendingEngineerResponse: any = [];
		const pendingUserResponse: any = [];
		const discussions: any = [];

		const orgMembers: UserContract[] = [];
		// Org members change very infrequently, so cache them in state for performance.
		// These users are loaded so we can quickly identify the messages that have come from
		// users who are outside of the current users org
		if (this.state.orgMembers) {
			orgMembers.push(...this.state.orgMembers);
		} else {
			for (const org of this.props.user.links['is member of']) {
				const members = await this.props.sdk.query({
					type: 'object',
					properties: {
						type: { const: 'user@1.0.0' },
					},
					$$links: {
						'is member of': {
							type: 'object',
							properties: {
								id: {
									const: org.id,
								},
							},
						},
					},
				});
				orgMembers.push(...members);
			}
			this.setState({
				orgMembers,
			});
		}

		for (const card of tail) {
			/**
			 * Check if the thread is pending user response:
			 *
			 * 1. Work through the timeline in reverse, so that we evaluate the most
			 *    recent events first
			 * 2. If there is a message or whisper that has the 'pendinguserresponse' tag,
			 *    then we are waiting for a response
			 * 3. If a proxy response is found before the tag, then we are not waiting
			 *    for a response
			 */

			// Sort the timeline by timestamp rather than created_at as they might
			// not be the same value if the card was backsynced
			const timeline = _.sortBy(
				_.get(card.links, ['has attached element'], []),
				'data.timestamp',
			);

			// If the card contains a message/whisper tagged as a discussion, move it to the discussion tab
			for (const event of timeline) {
				if (_.includes(event.tags, 'discussion')) {
					discussions.push(card);
					return;
				}
			}

			// Reverse the timeline, so the newest messages appear first
			timeline.reverse();

			let isPendingUserResponse = false;
			let isPendingEngineerResponse = false;
			let hasEngineerResponse = false;

			// Iterate over the timeline
			for (const event of timeline) {
				const typeBase = event.type.split('@')[0];

				// If the thread has re-opened then the we are waiting on action
				// from the agent and can break out of the loop
				if (typeBase === 'update' && THREAD_REOPEN_NAME_RE.test(event.name)) {
					break;
				}

				if (typeBase === 'message' || typeBase === 'whisper') {
					// If the message contains the 'pendingagentresponse' tag, then we are
					// waiting on a response from the agent and can break out of the loop
					if (
						event.data.payload.message &&
						event.data.payload.message.match(/#(<span>)?pendingagentresponse/gi)
					) {
						break;
					}

					// If the message contains the 'pendinguserresponse' tag and its
					// been less than 3 working days since the message was created, then we are
					// waiting on a response from the user and can break out of the loop
					if (
						event.data.payload.message &&
						event.data.payload.message.match(
							/#(<span>)?pendinguserresponse/gi,
						) &&
						isAfter(
							addBusinessDays(
								new Date(event.data.timestamp),
								USER_RESPONSE_TIMEOUT_DAYS,
							),
							Date.now(),
						)
					) {
						isPendingUserResponse = true;
						break;
					}

					// If the message contains the 'pendingengineerresponse' tag and its
					// been less than 24hours since the message was created, then we are
					// waiting on a response from an engineer and can break out of the loop
					if (
						!hasEngineerResponse &&
						event.data.payload.message &&
						event.data.payload.message.match(
							/#(<span>)?pendingengineerresponse/gi,
						) &&
						new Date(event.data.timestamp).getTime() +
							ENGINEER_RESPONSE_TIMEOUT >
							Date.now()
					) {
						isPendingEngineerResponse = true;
						break;
					}

					// If we are still looping and the message came from a user outside of the current users org
					// we can simply break out of the loop
					const actorId = event.data.actor;
					const isInSameOrg = _.some(orgMembers, { id: actorId });

					if (isInSameOrg) {
						hasEngineerResponse = true;
					} else {
						break;
					}
				}
			}

			if (isPendingEngineerResponse) {
				pendingEngineerResponse.push(card);
			} else if (isPendingUserResponse) {
				pendingUserResponse.push(card);
			} else {
				pendingAgentResponse.push(card);
			}
		}

		const segments = [
			{
				name: 'All',
				cards: tail,
			},
			{
				name: 'pending agent response',
				cards: timestampSort(pendingAgentResponse),
			},
			{
				name: 'pending user response',
				cards: timestampSort(pendingUserResponse),
			},
			{
				name: 'pending engineer response',
				cards: timestampSort(pendingEngineerResponse),
			},
			{
				name: 'discussion',
				cards: timestampSort(discussions),
			},
		];

		this.setState({
			segments,
		});
	}

	setActiveIndex(index) {
		const target = _.get(this.props, ['channel', 'data', 'head', 'id']);
		this.props.actions.setLensState(SLUG, target, {
			activeIndex: index,
		});
	}

	render() {
		const { segments } = this.state;
		const { hasNextPage } = this.props;

		const threadTargets = _.map(this.props.channels, 'data.target');

		return (
			<Column data-test={`lens--${SLUG}`} overflowY>
				{segments.length === 0 && (
					<Box p={3}>
						Processing segments... <Icon spin name="cog" />
					</Box>
				)}
				{segments.length > 0 && (
					<StyledTabs
						activeIndex={this.props.lensState.activeIndex}
						onActive={this.setActiveIndex}
						// @ts-ignore: Rendition's Tabs component is (incorrectly?) cast to React.FunctionComponent<TabsProps>
						// so it doesn't know about style
						style={{
							height: '100%',
							display: 'flex',
							flexDirection: 'column',
						}}
					>
						{segments.map((segment) => {
							return (
								<Tab
									key={segment.name}
									title={`${segment.name} (${segment.cards.length}${
										segment.name === 'All' && hasNextPage ? '+' : ''
									})`}
								>
									<InfiniteList
										bg="#f8f9fd"
										key={segment.name}
										onScrollEnding={this.handleScrollEnding}
										style={{
											flex: 1,
											height: '100%',
											paddingBottom: 16,
										}}
									>
										{!(this.props.totalPages > this.props.page + 1) &&
											segment.cards.length === 0 && (
												<Box p={3}>
													<strong data-test="alt-text--no-support-threads">
														Good job! There are no support threads here
													</strong>
												</Box>
											)}

										{_.map(segment.cards, (card) => {
											const timeline = _.sortBy(
												_.get(card.links, ['has attached element'], []),
												'data.timestamp',
											);

											// Mark the summary as active if there are any channels open that target this contract, either by slug, slug@version, or id
											const summaryActive = !!_.find(
												threadTargets,
												(target) => {
													return (
														target === card.slug ||
														target === `${card.slug}@${card.version}` ||
														target === card.id
													);
												},
											);

											return (
												<CardChatSummary
													displayOwner
													getActor={this.props.actions.getActor}
													key={card.id}
													active={summaryActive}
													card={card}
													timeline={timeline}
													highlightedFields={['data.status', 'data.inbox']}
													to={helpers.appendToChannelPath(
														this.props.channel,
														card,
													)}
												/>
											);
										})}

										{hasNextPage && (
											<Box p={3}>
												<Icon spin name="cog" />
											</Box>
										)}
									</InfiniteList>
								</Tab>
							);
						})}
					</StyledTabs>
				)}
			</Column>
		);
	}
}
