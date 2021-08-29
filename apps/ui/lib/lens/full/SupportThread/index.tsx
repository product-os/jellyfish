/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import Bluebird from 'bluebird';
import { circularDeepEqual } from 'fast-equals';
import type { JSONSchema } from '@balena/jellyfish-types';
import * as _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import * as redux from 'redux';
import { Box, Flex, Theme, Txt } from 'rendition';
import styled from 'styled-components';
import {
	notifications,
	Collapsible,
	ColorHashPill,
	Event,
	helpers,
	Icon,
	PlainButton,
	ActionRouterLink,
	Link as RouterLink,
	TagList,
	Tag,
	ThreadMirrorIcon,
	withDefaultGetActorHref,
} from '@balena/jellyfish-ui-components';
import { actionCreators, selectors, sdk } from '../../../core';
import SlideInFlowPanel from '../../../components/Flows/SlideInFlowPanel';
import Timeline from '../../list/Timeline';
import CardLayout from '../../../layouts/CardLayout';
import CardFields from '../../../components/CardFields';
import { FLOW_IDS, TeardownFlowPanel } from '../../../components/Flows';
import { IssueOpenedIcon, GitPullRequestIcon } from '@primer/styled-octicons';
import { SubscribeButton } from './SubscribeButton';

const JellyIcon = styled.img.attrs({
	src: '/icons/jellyfish.svg',
})`
	height: 15px;
	transform: translateY(3px);
	margin-top: -2px;
`;

const LINKS = [
	{
		verb: 'support thread is attached to issue',
		icon: <IssueOpenedIcon size={16} />,
		testId: 'linked-issue',
		description: ({ id }) => `Support thread by id ${id} attached to issue`,
	},
	{
		verb: 'support thread is attached to pull request',
		icon: <GitPullRequestIcon size={16} />,
		testId: 'linked-pr',
		description: ({ id }) =>
			`Support thread by id ${id} attached to pull request`,
	},
	{
		verb: 'support thread is attached to support issue',
		icon: <JellyIcon />,
		testId: 'linked-support-issue',
		description: ({ id }) =>
			`Support thread by id ${id} attached to support issue`,
	},
	{
		verb: 'support thread is attached to improvement',
		icon: <JellyIcon />,
		testId: 'linked-improvement',
		description: ({ id }) =>
			`Support thread by id ${id} attached to improvement`,
	},
	{
		verb: 'has attached',
		query: {
			required: ['type'],
			properties: {
				type: {
					const: 'pattern@1.0.0',
				},
			},
		},
		icon: <JellyIcon />,
		testId: 'linked-pattern',
		description: ({ id }) => `Support thread by id ${id} has attached pattern`,
	},
];

const Extract = styled(Box)`
	background: lightyellow;
	border-top: 1px solid ${Theme.colors.gray.light};
	border-bottom: 1px solid ${Theme.colors.gray.light};
`;

const getHighlights = (card) => {
	const list = _.sortBy(
		_.filter(_.get(card, ['links', 'has attached element']), (event) => {
			const typeBase = event.type.split('@')[0];
			if (!_.includes(['message', 'whisper', 'rating'], typeBase)) {
				return false;
			}
			const message = _.get(event, ['data', 'payload', 'message']);
			return Boolean(message) && Boolean(message.match(/(#summary|#status)/gi));
		}),
		'data.timestamp',
	);
	return _.uniqBy(list, (item) => {
		return _.get(item, ['data', 'payload', 'message']);
	});
};

class SupportThreadBase extends React.Component<any, any> {
	reopen;
	close;
	archiveCard;
	removeLink;

	constructor(props) {
		super(props);

		this.reopen = () => {
			this.setState({
				isClosing: true,
			});

			const { card } = this.props;

			const patch = helpers.patchPath(card, ['data', 'status'], 'open');

			sdk.card
				.update(card.id, card.type, patch)
				.then(() => {
					notifications.addNotification('success', 'Opened support thread');
				})
				.catch((error) => {
					notifications.addNotification('danger', error.message || error);
				})
				.finally(() => {
					this.setState({
						isClosing: false,
					});
				});
		};

		this.close = async () => {
			const {
				card,
				actions: { setFlow },
			} = this.props;

			const [summaryCard] = await sdk.query(
				{
					type: 'object',
					required: ['type'],
					properties: {
						type: {
							const: 'summary@1.0.0',
						},
					},
					$$links: {
						'is attached to': {
							type: 'object',
							additionalProperties: false,
							required: ['id'],
							properties: {
								id: {
									type: 'string',
									const: card.id,
								},
							},
						},
					},
				},
				{
					limit: 1,
					// TS-TODO: Improve SdkQueryOptions typings in jellyfish-client-sdk module
					sortBy: ['data', 'timestamp'] as any,
					sortDir: 'desc',
				},
			);

			const [ratingCard] = await sdk.query(
				{
					type: 'object',
					required: ['type'],
					properties: {
						type: {
							const: 'rating@1.0.0',
						},
					},
					$$links: {
						'is attached to': {
							type: 'object',
							additionalProperties: false,
							required: ['id'],
							properties: {
								id: {
									type: 'string',
									const: card.id,
								},
							},
						},
					},
				},
				{
					limit: 1,
					sortBy: ['data', 'timestamp'] as any,
					sortDir: 'desc',
				},
			);

			const flowState = {
				isOpen: true,
				card,
				summary: _.get(summaryCard, ['data', 'payload', 'message'], ''),
				rating: _.get(ratingCard, ['data', 'payload'], {
					score: null,
					comment: '',
				}),
			};
			setFlow(FLOW_IDS.GUIDED_TEARDOWN, card.id, flowState);
		};

		this.archiveCard = () => {
			this.setState({
				isClosing: true,
			});

			const { card } = this.props;

			const patch = helpers.patchPath(card, ['data', 'status'], 'archived');

			sdk.card
				.update(card.id, card.type, patch)
				.then(() => {
					notifications.addNotification('success', 'Archived support thread');
					this.props.actions.removeChannel(this.props.channel);
				})
				.catch((error) => {
					notifications.addNotification('danger', error.message || error);
					this.setState({
						isClosing: false,
					});
				});
		};

		this.removeLink = async (fromCard, toCard, verb) => {
			try {
				await sdk.card.unlink(fromCard, toCard, verb);
			} catch (err: any) {
				notifications.addNotification('danger', err.message);
				return;
			}

			notifications.addNotification('success', 'Link removed');

			this.setState((state) => ({
				linkedCardsMap: {
					...state.linkedCardsMap,
					[verb]: state.linkedCardsMap[verb].filter((linkedCard) => {
						return linkedCard.id !== toCard.id;
					}),
				},
			}));
		};

		this.state = {
			actor: null,
			isClosing: false,
			linkedCardsMap: {},
		};
		this.loadLinks(props.card.id);
	}

	async componentDidMount() {
		const actor = await helpers.getCreator(
			this.props.actions.getActor,
			this.props.card,
		);

		this.setState({
			actor,
		});
	}

	async loadLinks(id) {
		const baseSchema: JSONSchema = {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					const: id,
				},
				type: {
					type: 'string',
					const: 'support-thread@1.0.0',
				},
			},
			additionalProperties: true,
		};

		const linkedCardsMap = await Bluebird.props(
			LINKS.reduce((result, link) => {
				return {
					...result,
					[link.verb]: (async () => {
						const cardWithLinks: any = (
							await sdk.query({
								$$links: {
									[link.verb]: {
										type: 'object',
										additionalProperties: true,
										...(link.query || {}),
									},
								},
								description: link.description({
									id,
								}),
								...baseSchema,
							})
						)[0];

						if (!cardWithLinks) {
							return [];
						}

						return cardWithLinks.links[link.verb];
					})(),
				};
			}, {}),
		);

		this.setState({
			linkedCardsMap,
		});
	}

	shouldComponentUpdate(nextProps, nextState) {
		return (
			!circularDeepEqual(nextProps, this.props) ||
			!circularDeepEqual(nextState, this.state)
		);
	}

	componentDidUpdate(prevProps) {
		if (
			prevProps.card.id !== this.props.card.id ||
			LINKS.some(
				(link) =>
					prevProps.card.linked_at[link.verb] !==
					this.props.card.linked_at[link.verb],
			)
		) {
			this.loadLinks(this.props.card.id);
		}
	}

	render() {
		const { card, channel, getActorHref } = this.props;
		const { linkedCardsMap } = this.state;
		const typeCard = _.find(this.props.types, {
			slug: card.type.split('@')[0],
		});

		const { actor, isClosing } = this.state;

		const highlights = getHighlights(card);

		const status = _.get(card, ['data', 'status'], 'open');

		const mirrors = _.get(card, ['data', 'mirrors']);
		const isMirrored = !_.isEmpty(mirrors);

		const statusDescription = _.get(card, ['data', 'statusDescription']);

		return (
			<CardLayout
				card={card}
				channel={channel}
				title={
					<Flex flex={1} justifyContent="space-between">
						<Flex
							flex={1}
							flexWrap="wrap"
							alignItems="center"
							style={{
								transform: 'translateY(2px)',
							}}
						>
							<ColorHashPill
								value={_.get(card, ['data', 'inbox'])}
								mr={2}
								mb={1}
							/>
							<ColorHashPill
								data-test={`status-${_.get(card, ['data', 'status'])}`}
								value={_.get(card, ['data', 'status'])}
								mr={2}
								mb={1}
							/>

							<TagList
								tags={card.tags}
								blacklist={['status', 'summary', 'pendinguserresponse']}
							/>

							<TagList tags={_.get(card, ['data', 'tags'], [])} />
						</Flex>

						<SubscribeButton card={card} />

						{status === 'open' && (
							<PlainButton
								data-test="support-thread__close-thread"
								tooltip={{
									placement: 'bottom',
									text: 'Close this support thread',
								}}
								onClick={this.close}
								icon={
									<Icon name={isClosing ? 'cog' : 'archive'} spin={isClosing} />
								}
							/>
						)}

						{status === 'closed' && (
							<PlainButton
								data-test="support-thread__archive-thread"
								tooltip={{
									placement: 'bottom',
									text: 'Archive this support thread',
								}}
								onClick={this.archiveCard}
								icon={
									<Icon name={isClosing ? 'cog' : 'box'} spin={isClosing} />
								}
							/>
						)}

						{status === 'archived' && (
							<PlainButton
								data-test="support-thread__open-thread"
								tooltip={{
									placement: 'bottom',
									text: 'Open this support thread',
								}}
								onClick={this.reopen}
								icon={
									<Icon
										name={isClosing ? 'cog' : 'box-open'}
										spin={isClosing}
									/>
								}
							/>
						)}
					</Flex>
				}
				actionItems={
					<React.Fragment>
						<ActionRouterLink append="view-all-support-issues">
							Search support issues
						</ActionRouterLink>

						<ActionRouterLink append="view-all-issues">
							Search GitHub issues
						</ActionRouterLink>

						<ActionRouterLink append="view-all-patterns">
							Search patterns
						</ActionRouterLink>
					</React.Fragment>
				}
			>
				<Box px={3}>
					<Flex alignItems="center" mb={1} flexWrap="wrap">
						{LINKS.map((link) => {
							return (
								<React.Fragment key={link.verb}>
									{linkedCardsMap[link.verb] &&
										linkedCardsMap[link.verb].map((linkedCard) => (
											<Tag
												key={linkedCard.id}
												mr={2}
												mb={1}
												onRemove={() =>
													this.removeLink(card, linkedCard, link.verb)
												}
											>
												{link.icon}
												<RouterLink
													ml={1}
													append={linkedCard.slug || linkedCard.id}
													key={linkedCard.id}
													tooltip={linkedCard.name}
													data-test={`support-thread__${link.testId}`}
												>
													{linkedCard.name}
												</RouterLink>
											</Tag>
										))}
								</React.Fragment>
							);
						})}
					</Flex>

					<Collapsible
						mt={1}
						maxContentHeight="50vh"
						title={
							(
								<Flex alignItems="center" flexWrap="wrap">
									<ThreadMirrorIcon mirrors={mirrors} mr={2} />
									{Boolean(actor) && (
										<Txt.span tooltip={actor.email}>
											Conversation with <Txt.span bold>{actor.name}</Txt.span>
											{Boolean(card.name) && <Txt.span mr={2}>:</Txt.span>}
										</Txt.span>
									)}
									{Boolean(card.name) && <Txt.span bold>{card.name}</Txt.span>}
								</Flex>
							) as any
						}
						defaultCollapsed={false}
						data-test="support-thread__collapse-status"
					>
						{statusDescription && (
							<Txt
								color="text.light"
								data-test="support-thread__status-description"
							>
								{statusDescription}
							</Txt>
						)}
						<Collapsible
							mt={1}
							title="Details"
							maxContentHeight="50vh"
							lazyLoadContent
							data-test="support-thread-details"
						>
							<Flex mt={1} justifyContent="space-between">
								<Txt>
									<em>Created {helpers.formatTimestamp(card.created_at)}</em>
								</Txt>
								<Txt>
									<em>
										Updated{' '}
										{helpers.timeAgo(
											_.get(helpers.getLastUpdate(card), [
												'data',
												'timestamp',
											]) as any,
										)}
									</em>
								</Txt>
							</Flex>

							{highlights.length > 0 && (
								<Collapsible
									mt={1}
									title="Highlights"
									lazyLoadContent
									data-test="support-thread-highlights"
								>
									<Extract py={2}>
										{_.map(highlights, (statusEvent) => {
											return (
												<Event
													key={statusEvent.id}
													card={statusEvent}
													user={this.props.user}
													groups={this.props.groups}
													mb={1}
													threadIsMirrored={isMirrored}
													getActorHref={getActorHref}
												/>
											);
										})}
									</Extract>
								</Collapsible>
							)}

							<CardFields card={card} type={typeCard} />
						</Collapsible>
					</Collapsible>
				</Box>
				<Box
					flex="1"
					style={{
						minHeight: 0,
					}}
				>
					<Timeline.data.renderer
						allowWhispers
						card={this.props.card}
						tail={_.get(this.props.card.links, ['has attached element'], [])}
					/>
				</Box>
				<SlideInFlowPanel
					slideInPanelProps={{
						height: 500,
					}}
					card={card}
					flowId={FLOW_IDS.GUIDED_TEARDOWN}
				>
					<TeardownFlowPanel />
				</SlideInFlowPanel>
			</CardLayout>
		);
	}
}

const mapStateToProps = (state) => {
	return {
		accounts: selectors.getAccounts(state),
		types: selectors.getTypes(state),
		groups: selectors.getGroups(state),
		user: selectors.getCurrentUser(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
				'getActor',
				'loadMoreViewData',
				'setFlow',
				'removeChannel',
				'removeLink',
			]),
			dispatch,
		),
	};
};

export default {
	slug: 'lens-support-thread',
	type: 'lens',
	version: '1.0.0',
	name: 'Support thread lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: redux.compose(
			connect(mapStateToProps, mapDispatchToProps),
			withDefaultGetActorHref(),
		)(SupportThreadBase),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'support-thread@1.0.0',
				},
			},
		},
	},
};
