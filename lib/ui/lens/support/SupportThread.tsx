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
	Txt
} from 'rendition';
import { Markdown } from 'rendition/dist/extra/Markdown';
import { Mermaid } from 'rendition/dist/extra/Mermaid';
import styled from 'styled-components';
import { Card, Lens, Type } from '../../../Types';
import { CardActions } from '../../components/CardActions';
import Label from '../../components/Label';
import { Tag } from '../../components/Tag';
import { sdk } from '../../core';
import { actionCreators, selectors, StoreState } from '../../core/store';
import {
	findUsernameById,
	formatTimestamp,
	getLocalSchema,
} from '../../services/helpers';
import TimelineLens from './SupportThreadTimeline';

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

interface CardProps {
	card: Card;
	allUsers: Card[];
	types: Type[];
	fieldOrder?: string[];
	actions: typeof actionCreators;
}

interface CardState {
	linkedScratchpadEntries: Card[];
}

class Base extends React.Component<CardProps, CardState> {
	constructor(props: CardProps) {
		super(props);

		this.state = {
			linkedScratchpadEntries: [],
		};

		this.loadLinks(props.card.id);
	}

	public loadLinks(id: string): void  {
		sdk.query({
			$$links: {
				'scratchpad entry was used in support thread': {
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
			},
			additionalProperties: true,
		} as any)
			.then(([ result ]) => {
				if (result) {
					this.setState({
						linkedScratchpadEntries: _.get(result, [ 'links', 'scratchpad entry was used in support thread' ]),
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

		return (
			<Column
				className={`column--${card ? card.slug || card.type : 'unknown'}`}
				flex="1"
				flexDirection="column"
			>
				<Box p={3} style={{maxHeight: '50%', borderBottom: '1px solid #ccc', overflowY: 'auto'}}>
					<Flex justify="space-between">
						<Txt>
							Support conversation with <strong>{findUsernameById(this.props.allUsers, createCard.data.actor)}</strong>
						</Txt>

						<CardActions
							card={card}
						/>
					</Flex>

					{!!card.tags && card.tags.length > 0 &&
						<Box mb={1}>
							{_.map(card.tags, (tag) => {
								return <Tag mr={2}>#{tag}</Tag>;
							})}
						</Box>
					}

					{_.map(this.state.linkedScratchpadEntries, (entry) => {
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
				</Box>

				<Box flex="1 0 50%" style={{ overflowY: 'auto'}}>
					<TimelineLens.data.renderer card={this.props.card} />
				</Box>
			</Column>
		);
	}
}

const mapStateToProps = (state: StoreState) => {
	return {
		allUsers: selectors.getAllUsers(state),
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
