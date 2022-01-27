import { circularDeepEqual } from 'fast-equals';
import * as _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import * as redux from 'redux';
import { Box, Divider, Flex, Tab, Txt } from 'rendition';
import styled from 'styled-components';
import {
	notifications,
	ColorHashPill,
	Event,
	helpers,
	Icon,
	PlainButton,
	ActionRouterLink,
	TagList,
	ThreadMirrorIcon,
	withDefaultGetActorHref,
} from '@balena/jellyfish-ui-components';
import { actionCreators, selectors, sdk } from '../../../core';
import { RelationshipsTab, customQueryTabs } from '../../common';
import Timeline from '../../list/Timeline';
import CardLayout from '../../../layouts/CardLayout';
import CardFields from '../../../components/CardFields';
import ContractRenderer, { ContractTabs } from '../../common/ContractRenderer';
import { SubscribeButton } from './SubscribeButton';
import { any } from 'bluebird';

const Extract = styled(Box)`
	background: lightyellow;
`;

class SupportThreadBase extends React.Component<any, any> {
	constructor(props) {
		super(props);

		this.reopen = this.reopen.bind(this);
		this.close = this.close.bind(this);
		this.archive = this.archive.bind(this);

		this.state = {
			actor: null,
			isClosing: false,
			highlights: [],
		};
	}

	async componentDidMount() {
		const actor = await helpers.getCreator(
			this.props.actions.getActor,
			this.props.card,
		);

		this.setState({
			actor,
		});

		this.loadHighlights(this.props.card.id);
	}

	reopen() {
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
	}

	close() {
		const { card } = this.props;
		this.setState({
			isClosing: true,
		});

		sdk.card
			.update(card.id, card.type, [
				{
					op: 'replace',
					path: '/data/status',
					value: 'closed',
				},
			])
			.then(() => {
				notifications.addNotification('success', 'Closed support thread');
				this.props.actions.removeChannel(this.props.channel);
			})
			.catch((error) => {
				notifications.addNotification('danger', error.message || error);
				this.setState({
					isClosing: false,
				});
			});
	}

	archive() {
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
	}

	async loadHighlights(id: string): Promise<void> {
		const [result] = await sdk.query(
			{
				$$links: {
					'has attached element': {
						type: 'object',
						properties: {
							tags: {
								type: 'array',
								contains: {
									type: 'string',
									enum: ['summary', 'status'],
								},
							},
						},
					},
				},
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
			},
			{
				links: {
					'has attached element': {
						sortBy: ['data', 'timestamp'],
					},
				},
			},
		);

		const highlights =
			result && result.links ? result.links['has attached element'] : [];

		this.setState({
			highlights,
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
			prevProps.card.linked_at['has attached element'] !==
				this.props.card.linked_at['has attached element']
		) {
			this.loadHighlights(this.props.card.id);
		}
	}

	setActiveIndex(activeIndex) {
		this.setState({
			activeIndex,
		});
	}

	render() {
		const { card, channel, getActorHref, types } = this.props;
		const { actor, highlights, isClosing } = this.state;

		const typeContract = helpers.getType(card.type, types);

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
						<Box>
							<Box>
								<ThreadMirrorIcon mirrors={mirrors} mr={2} />
								{Boolean(actor) && (
									<Txt.span tooltip={actor.email}>
										Conversation with {actor.name}
										{Boolean(card.name) && <Txt.span>: </Txt.span>}
									</Txt.span>
								)}
								{Boolean(card.name) && <Txt.span bold>{card.name}</Txt.span>}
							</Box>
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
									data-test={`status-${status}`}
									value={status}
									mr={2}
									mb={1}
								/>

								<TagList
									tags={card.tags}
									blacklist={[
										'status',
										'summary',
										'pendinguserresponse',
										'pendingagentresponse',
										'pendingengineerresponse',
									]}
								/>

								<TagList tags={_.get(card, ['data', 'tags'], [])} />
							</Flex>
						</Box>

						<Flex mt={1} alignItems="start">
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
										<Icon
											name={isClosing ? 'cog' : 'archive'}
											spin={isClosing}
										/>
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
									onClick={this.archive}
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
					</Flex>
				}
				actionItems={
					<React.Fragment>
						<ActionRouterLink append="view-all-issues">
							Search GitHub issues
						</ActionRouterLink>

						<ActionRouterLink append="view-all-patterns">
							Search patterns
						</ActionRouterLink>
					</React.Fragment>
				}
			>
				<Divider width="100%" color={helpers.colorHash(card.type)} />

				<ContractTabs
					activeIndex={this.state.activeIndex}
					onActive={this.setActiveIndex}
				>
					<Tab title="Info">
						<Box px={3}>
							{statusDescription && (
								<Txt
									color="text.light"
									data-test="support-thread__status-description"
								>
									{statusDescription}
								</Txt>
							)}

							{highlights.length > 0 && (
								<Box pt={2}>
									<Txt bold>Highlights</Txt>
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
									<Divider width="100%" />
								</Box>
							)}

							<CardFields card={card} type={typeContract} />
						</Box>
					</Tab>

					<Tab data-test="timeline-tab" title="Timeline">
						<Timeline.data.renderer
							card={card}
							allowWhispers
							tail={_.get(this.props.card.links, ['has attached element'], [])}
						/>
					</Tab>

					{customQueryTabs(card, typeContract)}
					<RelationshipsTab card={card} />
				</ContractTabs>
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
				'removeChannel',
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
