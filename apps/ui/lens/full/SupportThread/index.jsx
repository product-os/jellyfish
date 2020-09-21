/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as Bluebird from 'bluebird'
import {
	circularDeepEqual
} from 'fast-equals'
import * as _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import {
	Box,
	Button,
	Flex,
	Link,
	Theme,
	Txt
} from 'rendition'
import styled from 'styled-components'
import {
	actionCreators,
	selectors,
	sdk
} from '../../../core'
import SlideInFlowPanel from '../../../components/Flows/SlideInFlowPanel'
import * as helpers from '@balena/jellyfish-ui-components/lib/services/helpers'
import Timeline from '../../list/Timeline'
import CardLayout from '../../../layouts/CardLayout'
import CardFields from '../../../components/CardFields'
import Event from '@balena/jellyfish-ui-components/lib/Event'
import RouterLink from '@balena/jellyfish-ui-components/lib/Link'
import Collapsible from '@balena/jellyfish-ui-components/lib/Collapsible'
import {
	addNotification
} from '@balena/jellyfish-ui-components/lib/services/notifications'
import {
	TagList,
	Tag
} from '@balena/jellyfish-ui-components/lib/Tag'
import {
	ThreadMirrorIcon
} from '@balena/jellyfish-ui-components/lib/MirrorIcon'
import ColorHashPill from '@balena/jellyfish-ui-components/lib/shame/ColorHashPill'
import Icon from '@balena/jellyfish-ui-components/lib/shame/Icon'
import {
	withDefaultGetActorHref
} from '@balena/jellyfish-ui-components/lib/HOC/with-default-get-actor-href'
import {
	FLOW_IDS,
	TeardownFlowPanel
} from '../../../components/Flows'

const JellyIcon = styled.img.attrs({
	src: '/icons/jellyfish.svg'
}) `
	height: 15px;
	transform: translateY(3px);
	margin-top: -2px;
`

const Extract = styled(Box) `
	background: lightyellow;
	border-top: 1px solid ${Theme.colors.gray.light};
	border-bottom: 1px solid ${Theme.colors.gray.light};
`

const getHighlights = (card) => {
	const list = _.sortBy(_.filter(_.get(card, [ 'links', 'has attached element' ]), (event) => {
		const typeBase = event.type.split('@')[0]
		if (!_.includes([ 'message', 'whisper' ], typeBase)) {
			return false
		}
		const message = _.get(event, [ 'data', 'payload', 'message' ])
		return Boolean(message) && Boolean(message.match(/(#summary|#status)/gi))
	}), 'data.timestamp')
	return _.uniqBy(list, (item) => {
		return _.get(item, [ 'data', 'payload', 'message' ])
	})
}

class SupportThreadBase extends React.Component {
	constructor (props) {
		super(props)

		this.reopen = () => {
			this.setState({
				isClosing: true
			})

			const {
				card
			} = this.props

			const patch = helpers.patchPath(card, [ 'data', 'status' ], 'open')

			sdk.card.update(card.id, card.type, patch)
				.then(() => {
					addNotification('success', 'Opened support thread')
				})
				.catch((error) => {
					addNotification('danger', error.message || error)
				})
				.finally(() => {
					this.setState({
						isClosing: false
					})
				})
		}

		this.close = async () => {
			const {
				card,
				actions: {
					setFlow
				}
			} = this.props

			const [ summaryCard ] = await sdk.query({
				type: 'object',
				required: [ 'type' ],
				properties: {
					type: {
						const: 'summary@1.0.0'
					}
				},
				$$links: {
					'is attached to': {
						type: 'object',
						additionalProperties: false,
						required: [ 'id' ],
						properties: {
							id: {
								type: 'string',
								const: card.id
							}
						}
					}
				}
			}, {
				limit: 1,
				sortBy: [ 'data', 'timestamp' ],
				sortDir: 'desc'
			})

			const flowState = {
				isOpen: true,
				card,
				summary: _.get(summaryCard, [ 'data', 'payload', 'message' ], '')
			}
			setFlow(FLOW_IDS.GUIDED_TEARDOWN, card.id, flowState)
		}

		this.archiveCard = () => {
			this.setState({
				isClosing: true
			})

			const {
				card
			} = this.props

			const patch = helpers.patchPath(card, [ 'data', 'status' ], 'archived')

			sdk.card.update(card.id, card.type, patch)
				.then(() => {
					addNotification('success', 'Archived support thread')
					this.props.actions.removeChannel(this.props.channel)
				})
				.catch((error) => {
					addNotification('danger', error.message || error)
					this.setState({
						isClosing: false
					})
				})
		}

		this.state = {
			actor: null,
			isClosing: false,
			linkedSupportIssues: [],
			linkedGitHubIssues: [],
			linkedProductImprovements: []
		}
		this.loadLinks(props.card.id)
	}

	async componentDidMount () {
		const actor = await helpers.getCreator(this.props.actions.getActor, this.props.card)

		this.setState({
			actor
		})
	}

	loadLinks (id) {
		const baseSchema = {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					const: id
				},
				type: {
					type: 'string',
					const: 'support-thread@1.0.0'
				}
			},
			additionalProperties: true
		}
		Bluebird.all([
			sdk.query({
				$$links: {
					'support thread is attached to support issue': {
						type: 'object',
						additionalProperties: true
					}
				},
				description: `Support thread by id ${id} attached to support issue`,
				...baseSchema
			}),
			sdk.query({
				$$links: {
					'support thread is attached to issue': {
						type: 'object',
						additionalProperties: true
					}
				},
				description: `Support thread by id ${id} attached to issue`,
				...baseSchema
			}),
			sdk.query({
				$$links: {
					'support thread is attached to product improvement': {
						type: 'object',
						additionalProperties: true
					}
				},
				description: `Support thread by id ${id} attached to product improvements`,
				...baseSchema
			})
		])
			.then(([ supportIssueResult, issueResult, productImprovementResult ]) => {
				if (supportIssueResult.length) {
					this.setState({
						linkedSupportIssues: _.get(
							supportIssueResult[0],
							[ 'links', 'support thread is attached to support issue' ]
						)
					})
				}

				if (issueResult.length) {
					this.setState({
						linkedGitHubIssues: _.get(
							issueResult[0],
							[ 'links', 'support thread is attached to issue' ]
						)
					})
				}

				if (productImprovementResult.length) {
					this.setState({
						linkedProductImprovements: _.get(
							productImprovementResult[0],
							[ 'links', 'support thread is attached to product improvement' ]
						)
					})
				}
			})
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextProps, this.props) || !circularDeepEqual(nextState, this.state)
	}

	componentDidUpdate (prevProps) {
		const verb1 = 'support thread is attached to support issue'
		const verb2 = 'support thread is attached to issue'
		const verb3 = 'support thread is attached to product improvement'
		if (
			(prevProps.card.id !== this.props.card.id) ||
			(prevProps.card.linked_at[verb1] !== this.props.card.linked_at[verb1]) ||
			(prevProps.card.linked_at[verb2] !== this.props.card.linked_at[verb2]) ||
			(prevProps.card.linked_at[verb3] !== this.props.card.linked_at[verb3])
		) {
			this.loadLinks(this.props.card.id)
		}
	}

	render () {
		const {
			card,
			channel,
			getActorHref
		} = this.props
		const {
			linkedSupportIssues,
			linkedGitHubIssues,
			linkedProductImprovements
		} = this.state
		const typeCard = _.find(this.props.types, {
			slug: card.type.split('@')[0]
		})

		const {
			actor,
			isClosing
		} = this.state

		const highlights = getHighlights(card)

		const status = _.get(card, [ 'data', 'status' ], 'open')

		const mirrors = _.get(card, [ 'data', 'mirrors' ])
		const isMirrored = !_.isEmpty(mirrors)

		const statusDescription = _.get(card, [ 'data', 'statusDescription' ])

		return (
			<CardLayout
				card={card}
				channel={channel}
				title={(
					<Flex flex={1} justifyContent="space-between">
						<Flex flex={1} flexWrap="wrap"
							style={{
								transform: 'translateY(2px)'
							}}
						>
							<ColorHashPill value={_.get(card, [ 'data', 'inbox' ])} mr={2} mb={1} />
							<ColorHashPill
								data-test={`status-${_.get(card, [ 'data', 'status' ])}`}
								value={_.get(card, [ 'data', 'status' ])}
								mr={2}
								mb={1}
							/>

							<TagList
								tags={card.tags}
								blacklist={[ 'status', 'summary', 'pendinguserresponse' ]}
							/>
						</Flex>

						{status === 'open' && (
							<Button
								plain
								mr={3}
								data-test="support-thread__close-thread"
								tooltip={{
									placement: 'bottom',
									text: 'Close this support thread'
								}}
								onClick={this.close}
								icon={
									<Icon
										name={isClosing ? 'cog' : 'archive'}
										spin={isClosing}
									/>
								}
							/>
						)}

						{status === 'closed' && (
							<Button
								plain
								mr={3}
								data-test="support-thread__archive-thread"
								tooltip={{
									placement: 'bottom',
									text: 'Archive this support thread'
								}}
								onClick={this.archiveCard}
								icon={
									<Icon
										name={isClosing ? 'cog' : 'box'}
										spin={isClosing}
									/>
								}
							/>
						)}

						{status === 'archived' && (
							<Button
								plain
								mr={3}
								data-test="support-thread__open-thread"
								tooltip={{
									placement: 'bottom',
									text: 'Open this support thread'
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
				)}
				actionItems={(
					<React.Fragment>
						<RouterLink append="view-all-support-issues">
							Search support issues
						</RouterLink>

						<RouterLink append="view-all-issues">
							Search GitHub issues
						</RouterLink>

						<RouterLink append="view-all-patterns">
							Search patterns
						</RouterLink>
					</React.Fragment>
				)}
			>
				<Box px={3}>
					<Flex alignItems="center" mb={1} flexWrap="wrap">
						{Boolean(linkedGitHubIssues && linkedGitHubIssues.length) && _.map(linkedGitHubIssues, (entry) => {
							return (
								<Tag key={entry.id} mr={2} mb={1} tooltip={entry.name}>
									<Icon name="github" brands />
									<Link
										ml={1}
										href={`/${entry.slug || entry.id}`}
										key={entry.id}
										data-test="support-thread__linked-issue"
									>
										{entry.name}
									</Link>
								</Tag>
							)
						})}

						{Boolean(linkedSupportIssues && linkedSupportIssues.length) && _.map(linkedSupportIssues, (entry) => {
							return (
								<Tag key={entry.id} mr={2} mb={1} tooltip={entry.name}>
									<JellyIcon />
									<Link
										ml={1}
										href={`/${entry.slug || entry.id}`}
										key={entry.id}
										data-test="support-thread__linked-support-issue"
									>
										{entry.name}
									</Link>
								</Tag>
							)
						})}

						{_.map(linkedProductImprovements, (entry) => {
							return (
								<Tag key={entry.id} mr={2} mb={1} tooltip={entry.name}>
									<JellyIcon />
									<Link
										ml={1}
										href={`/${entry.slug || entry.id}`}
										key={entry.id}
										data-test="support-thread__linked-support-issue"
									>
										{entry.name}
									</Link>
								</Tag>
							)
						})}
					</Flex>

					<Collapsible
						mt={1}
						maxContentHeight='50vh'
						title={(
							<Flex alignItems="center" flexWrap="wrap" >
								<ThreadMirrorIcon mirrors={mirrors} mr={2}/>
								{Boolean(actor) && (
									<Txt.span tooltip={actor.email}>
										Conversation with <Txt.span bold>{actor.name}</Txt.span>
										{Boolean(card.name) && <Txt.span mr={2}>:</Txt.span>}
									</Txt.span>
								)}
								{Boolean(card.name) && <Txt.span bold>{card.name}</Txt.span>}
							</Flex>
						)}
						defaultCollapsed={false}
						data-test="support-thread__collapse-status"
					>
						{statusDescription && (
							<Txt color="text.light" data-test="support-thread__status-description">
								{statusDescription}
							</Txt>
						)}
						<Collapsible
							mt={1}
							title="Details"
							maxContentHeight='50vh'
							lazyLoadContent
							data-test="support-thread-details"
						>
							<Flex mt={1} justifyContent="space-between">
								<Txt><em>Created {helpers.formatTimestamp(card.created_at)}</em></Txt>
								<Txt>
									<em>
										Updated {helpers.timeAgo(_.get(helpers.getLastUpdate(card), [ 'data', 'timestamp' ]))}
									</em>
								</Txt>
							</Flex>

							{highlights.length > 0 && (
								<Collapsible mt={1} title="Highlights" lazyLoadContent data-test="support-thread-highlights">
									<Extract py={2}>
										{_.map(highlights, (statusEvent) => {
											return (
												<Event
													key={statusEvent.id}
													card={statusEvent}
													user={this.props.user}
													groups={this.props.groups}
													selectCard={selectors.getCard}
													getCard={this.props.actions.getCard}
													mb={1}
													threadIsMirrored={isMirrored}
													getActorHref={getActorHref}
												/>
											)
										})}
									</Extract>
								</Collapsible>
							)}

							<CardFields
								card={card}
								type={typeCard}
							/>
						</Collapsible>
					</Collapsible>

				</Box>
				<Box flex="1" style={{
					minHeight: 0
				}}>
					<Timeline.data.renderer
						allowWhispers
						card={this.props.card}
						tail={_.get(this.props.card.links, [ 'has attached element' ], [])}
					/>
				</Box>
				<SlideInFlowPanel
					slideInPanelProps={{
						height: 500
					}}
					card={card}
					flowId={FLOW_IDS.GUIDED_TEARDOWN}
				>
					<TeardownFlowPanel/>
				</SlideInFlowPanel>
			</CardLayout>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		accounts: selectors.getAccounts(state),
		types: selectors.getTypes(state),
		groups: selectors.getGroups(state),
		user: selectors.getCurrentUser(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
				'getActor',
				'getCard',
				'loadMoreViewData',
				'setFlow',
				'removeChannel'
			]),
			dispatch
		)
	}
}

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
			withDefaultGetActorHref()
		)(SupportThreadBase),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'support-thread@1.0.0'
				}
			}
		}
	}
}
