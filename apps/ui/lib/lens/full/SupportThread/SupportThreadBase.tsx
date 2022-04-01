import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { Box, Divider, Flex, Txt } from 'rendition';
import styled from 'styled-components';
import {
	ColorHashPill,
	Event,
	Icon,
	PlainButton,
	ActionRouterLink,
	TagList,
	ThreadMirrorIcon,
} from '../../../components';
import * as notifications from '../../../services/notifications';
import * as helpers from '../../../services/helpers';
import { sdk, actionCreators } from '../../../core';
import CardFields from '../../../components/CardFields';
import TabbedContractLayout from '../../../layouts/TabbedContractLayout';
import { SubscribeButton } from './SubscribeButton';
import {
	Contract,
	TypeContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';
import {
	BoundActionCreators,
	ChatGroup,
	LensRendererProps,
	UIActor,
} from '../../../types';

const Extract = styled(Box)`
	background: lightyellow;
`;

export interface StateProps {
	types: TypeContract[];
	groups: ChatGroup[];
	user: UserContract;
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

export interface HrefProps {
	getActorHref: (actor: UIActor) => string;
}

export type OwnProps = LensRendererProps;

type Props = StateProps & DispatchProps & OwnProps & HrefProps;

interface State {
	actor: UIActor | null;
	isClosing: boolean;
	highlights: Contract[];
}

export default class SupportThreadBase extends React.Component<Props, State> {
	constructor(props: Props) {
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
			this.props.card as UserContract,
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
			// TS-TODO: Make sure that `links` is an allowed query option key
			{
				links: {
					'has attached element': {
						sortBy: ['data', 'timestamp'],
					},
				},
			} as any,
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
				this.props.card.linked_at!['has attached element']
		) {
			this.loadHighlights(this.props.card.id);
		}
	}

	render() {
		const { card, channel, getActorHref, types } = this.props;
		const { actor, highlights, isClosing } = this.state;

		const typeContract = helpers.getType(card.type, types);

		const status: string = _.get(card, ['data', 'status'], 'open') as string;

		const mirrors: string[] = _.get(card, ['data', 'mirrors'], []) as string[];
		const isMirrored = !_.isEmpty(mirrors);

		const statusDescription: string = _.get(
			card,
			['data', 'statusDescription'],
			'',
		) as string;
		const inbox: string | null = _.get(card, ['data', 'inbox'], null) as
			| string
			| null;

		return (
			<TabbedContractLayout
				card={card}
				channel={channel}
				title={
					<Flex flex={1} justifyContent="space-between">
						<Box>
							<Box>
								<ThreadMirrorIcon mirrors={mirrors} mr={2} />
								{actor !== null && (
									<Txt.span tooltip={_.first(_.castArray(actor.email))}>
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
								{inbox !== null && (
									<ColorHashPill value={inbox} mr={2} mb={1} />
								)}
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
						{
							// Todo: Resolve the broken typing on ActionRouterLink
							// @ts-ignore
							<ActionRouterLink append="view-all-issues">
								Search GitHub issues
							</ActionRouterLink>
						}

						{
							// @ts-ignore
							<ActionRouterLink append="view-all-patterns">
								Search patterns
							</ActionRouterLink>
						}
					</React.Fragment>
				}
			>
				<>
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
				</>
			</TabbedContractLayout>
		);
	}
}
