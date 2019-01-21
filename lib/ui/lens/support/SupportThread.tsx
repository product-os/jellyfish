import { circularDeepEqual } from 'fast-equals';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Flex,
	Link,
	Pill,
	Theme,
	Txt
} from 'rendition';
import { Markdown } from 'rendition/dist/extra/Markdown';
import { Mermaid } from 'rendition/dist/extra/Mermaid';
import styled from 'styled-components';
import { Card, Lens, RendererProps, Type } from '../../../types';
import { CardActions } from '../../components/CardActions';
import { CloseButton } from '../../components/CloseButton';
import { Event as EventCard } from '../../components/Event';
import Icon from '../../components/Icon';
import { IconButton } from '../../components/IconButton';
import Label from '../../components/Label';
import { Tag } from '../../components/Tag';
import { sdk } from '../../core';
import { actionCreators, selectors, StoreState } from '../../core/store';
import {
	colorHash,
	findUsernameById,
	formatTimestamp,
	getLocalSchema,
	timeAgo,
} from '../../services/helpers';
import { getActor } from '../../services/store-helpers';
import TimelineLens from './SupportThreadTimeline';

const Extract = styled(Box)`
	border-top: 1px solid ${Theme.colors.gray.light};
	border-bottom: 1px solid ${Theme.colors.gray.light};
`;

const Column = styled(Flex)`
	height: 100%;
	overflow-y: auto;
	min-width: 270px;
`;

const Badge = styled(Txt)`
	display: inline-block;
	background: #555;
	color: white;
	border-radius: 4px;
	padding: 1px 8px;
	margin-right: 4px;
	font-size: 14px;
`;

const DataContainer = styled.pre`
	background: none;
	color: inherit;
	border: 0;
	margin: 0;
	padding: 0;
	font-size: inherit;
	white-space: pre-wrap;
	word-wrap: break-word;
`;

const transformMirror = (mirror: string) => {
	if (mirror.includes('frontapp.com')) {
		const id = mirror.split('/').pop();
		return `https://app.frontapp.com/open/${id}`;
	}

	return mirror;
};

const CardField = ({ field, payload, users, schema }: {
	field: string;
	payload: { [key: string]: any };
	users: Card[];
	schema?: JSONSchema6;
}) => {
	const value = payload[field];
	if (value === undefined) {
		return null;
	}
	// If the field starts with '$$' it is metaData and shouldn't be displayed
	if (_.startsWith(field, '$$')) {
		return null;
	}
	if (field === 'mirrors') {
		return (
			<React.Fragment>
				<Label my={3}>{field}</Label>
				{value.map((mirror: string) => {
					const url = transformMirror(mirror);
					return <Link key={url} blank href={url}>{url}</Link>;
				})}
			</React.Fragment>
		);
	}
	if (field === 'alertsUser' || field === 'mentionsUser') {
		const len = value.length;
		if (!len || !users) {
			return null;
		}
		const names = value.map((id: string) => findUsernameById(users, id));
		return (
			<Badge
				tooltip={names.join(', ')}
				my={1}
			>
				{field === 'alertsUser' ? 'Alerts' : 'Mentions'} {len} user{len !== 1 && 's'}
			</Badge>
		);
	}
	if (field === 'actor') {
		return <Txt my={3} bold>{findUsernameById(users, value)}</Txt>;
	}

	// Rendering can be optimzed for some known fields
	if (field === 'timestamp') {
		return <Txt my={3} color="#777">{formatTimestamp(value)}</Txt>;
	}

	if (schema && schema.format === 'mermaid') {
		return (
			<React.Fragment>
				<Label my={3}>{field}</Label>
				<Mermaid value={value} />
			</React.Fragment>
		);
	}

	if (schema && schema.format === 'markdown') {
		return (
			<React.Fragment>
				<Label my={3}>{field}</Label>
				<Markdown>{value}</Markdown>
			</React.Fragment>
		);
	}

	return (
		<React.Fragment>
			<Label my={3}>{field}</Label>
			{_.isObject(payload[field]) ?
				<Txt monospace={true}>
					<DataContainer>{JSON.stringify(payload[field], null, 4)}</DataContainer>
				</Txt>
				: <Txt>{`${payload[field]}`}</Txt>}
		</React.Fragment>
	);
};

interface CardProps extends RendererProps {
	card: Card;
	allUsers: Card[];
	accounts: Card[];
	types: Type[];
	fieldOrder?: string[];
	actions: typeof actionCreators;
	flex: any;
}

interface CardState {
	linkedSupportIssues: Card[];
	showHighlights: boolean;
	expanded: boolean;
}

class Base extends React.Component<CardProps, CardState> {
	constructor(props: CardProps) {
		super(props);

		this.state = {
			linkedSupportIssues: [],
			showHighlights: false,
			expanded: false,
		};

		this.loadLinks(props.card.id);
	}

	public loadLinks(id: string): void  {
		sdk.query({
			$$links: {
				'support thread is attached to support issue': {
					type: 'object',
					additionalProperties: true,
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
					const: 'support-thread',
				},
			},
			additionalProperties: true,
		} as any)
			.then(([ result ]) => {
				if (result) {
					this.setState({
						linkedSupportIssues: _.get(result, [ 'links', 'support thread is attached to support issue' ]),
					});
				}
			});
	}

	public shouldComponentUpdate(nextProps: CardProps, nextState: CardState): boolean {
		return !circularDeepEqual(nextProps, this.props) || !circularDeepEqual(nextState, this.state);
	}

	public componentWillUpdate(nextProps: CardProps): void {
		if (nextProps.card.id !== this.props.card.id) {
			this.loadLinks(nextProps.card.id);
		}
	}

	public getHighlights(card: Card): Card[] {
		const list = _.sortBy(_.filter(_.get(card, [ 'links', 'has attached element' ]), (event) => {
			if (!_.includes(['message', 'whisper'], event.type)) {
				return false;
			}
			return !!event.data.payload.message.match(/(#summary|#status)/);
		}), 'data.timestamp');

		return _.uniqBy(list, (item) => _.get(item, [ 'data', 'payload', 'message' ]));
	}

	public close = () => {
		sdk.card.update(this.props.card.id, _.merge({}, this.props.card, {
			data: {
				status: 'closed',
			},
		}))
			.then(() => {
				this.props.actions.addNotification('success', 'Close this support thread');
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message || error);
			});
	}

	public handleExpandToggle = () => {
		this.setState({
			expanded: !this.state.expanded,
		});
	}

	public render(): React.ReactNode {
		const { card, fieldOrder } = this.props;
		const payload = card.data;
		const typeCard = _.find(this.props.types, { slug: card.type });
		const typeSchema = _.get(typeCard, 'data.schema');
		const localSchema = getLocalSchema(card);

		// Local schemas are considered weak and are overridden by a type schema
		const schema = _.merge({}, {
			type: 'object',
			properties: {
				data: localSchema,
			},
		}, typeSchema);

		const unorderedKeys = _.filter(
			_.keys(payload),
			(key) => !_.includes(fieldOrder, key),
		);

		const keys = (fieldOrder || []).concat(unorderedKeys);

		const createCard = _.first((card as any).links['has attached element'])! as Card;

		const highlights = this.getHighlights(card);

		const actor = getActor(_.get(createCard, [ 'data', 'actor' ]));

		return (
			<Column
				flex={this.props.flex}
				className={`column--${card ? card.slug || card.type : 'unknown'}`}
				flexDirection="column"
			>
				<Box
					px={3}
					pt={3}
					mb={-24}
					style={{overflowY: 'auto'}}
				>
					<Flex mb={1} justify="space-between">
						<Flex align="center">
							{card.data.inbox && (
								<Pill
									mr={3}
									bg={colorHash(card.data.inbox)}
								>
									{card.data.inbox}
								</Pill>
							)}

							{!!card.tags && _.map(card.tags, (tag) => {
									if (tag === 'status' || tag === 'summary') {
										return null;
									}
									return <Tag key={tag} mr={2}>#{tag}</Tag>;
							})}
						</Flex>

						<Flex>
							<IconButton
								plaintext
								square
								mr={1}
								tooltip={{
									placement: 'bottom',
									text: 'Close this support thread',
								}}
								onClick={this.close}
							>
								<Icon name="archive" />
							</IconButton>

							<CardActions
								card={card}
							/>

							<CloseButton
								mr={-3}
								onClick={() => this.props.actions.removeChannel(this.props.channel)}
							/>
						</Flex>
					</Flex>

					<Flex justify="space-between" mt={3}>
						<Txt mb={1}>
							Conversation with <strong>{actor.name}</strong>
						</Txt>

						<Txt>Created {formatTimestamp(card.created_at)}</Txt>
					</Flex>

					<Flex justify="space-between">
						<Box>
							{!!card.name && (
								<Txt bold>{card.name}</Txt>
							)}
						</Box>

						<Txt>Updated {timeAgo(_.get(_.last(card.links['has attached element']), [ 'data', 'timestamp' ]))}</Txt>
					</Flex>

					{!this.state.expanded && (
						<Link
							onClick={this.handleExpandToggle}
							mt={2}
						>
							More
						</Link>
					)}

					{this.state.expanded && (
						<>
							{highlights.length > 0 && (
								<div>
									<strong>
										<Link
											mt={1}
											onClick={() => this.setState({ showHighlights: !this.state.showHighlights })}
										>
											Highlights{' '}
											<Icon name={`caret-${this.state.showHighlights ? 'down' : 'right'}`} />
										</Link>
									</strong>
								</div>
							)}

							{this.state.showHighlights && (
								<Extract py={2}>
									{_.map(highlights, (statusEvent: any) => {
										return (
											<EventCard
												card={statusEvent}
												mb={1}
											/>
										);
									})}
								</Extract>
							)}

							{_.map(this.state.linkedSupportIssues, (entry) => {
								return (
									<Link mr={2} href={`/#${entry.id}`}>{entry.name}</Link>
								);
							})}

							{_.map(keys, (key) => {
								return !!payload[key] ?
									<CardField
										key={key}
										field={key}
										payload={payload}
										users={this.props.allUsers}
										schema={_.get(schema, ['properties', 'data', 'properties', key])}
									/>
									: null;
								})
							}

							<Link
								mt={3}
								onClick={this.handleExpandToggle}
							>
								Less
							</Link>
						</>
					)}
				</Box>

				<Box flex="1" style={{minHeight: 0}}>
					<TimelineLens.data.renderer
						card={this.props.card}
						tail={this.props.card.links['has attached element']}
					/>
				</Box>
			</Column>
		);
	}
}

const mapStateToProps = (state: StoreState) => {
	return {
		allUsers: selectors.getAllUsers(state),
		accounts: selectors.getAccounts(state),
		types: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export const Renderer = connect(mapStateToProps, mapDispatchToProps)(Base);

const lens: Lens = {
	slug: 'lens-support-thread',
	type: 'lens',
	version: '1.0.0',
	name: 'Support thread lens',
	data: {
		icon: 'address-card',
		renderer: Renderer,
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'support-thread',
				},
			},
		},
	},
};

export default lens;
