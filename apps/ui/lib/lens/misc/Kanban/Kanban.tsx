import _ from 'lodash';
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import ReactTrello from 'react-trello';
import { Flex } from 'rendition';
import skhema from 'skhema';
import styled from 'styled-components';
import * as notifications from '../../../services/notifications';
import * as helpers from '../../../services/helpers';
import { Card } from './Card';
import { Setup, withSetup } from '../../../components/SetupProvider';
import { actionCreators } from '../../../store';
import type { BoundActionCreators, LensRendererProps } from '../../../types';
import type { Contract, TypeContract } from 'autumndb';

const TrelloWrapper = styled(Flex)`
	height: 100%;
	width: 100%;
	position: relative;
	overflow-x: auto;
	.react-trello-board > div {
		display: flex;
		height: 100%;
	}
	.smooth-dnd-draggable-wrapper > section {
		max-height: 100%;
	}
`;

const UNSORTED_GROUP_ID = 'JELLYFISH_UNSORTED_GROUP';

export const SLUG = 'lens-kanban';

const cardMapper = (card: Contract) => {
	const message = _.find(
		_.get(card, ['links', 'has attached element']),
		(linkedCard) => {
			return ['message', 'message@1.0.0'].includes(linkedCard.type);
		},
	);

	return {
		id: card.id,
		type: card.type,
		title: card.name || card.slug || `${card.type}: ${card.id.substr(0, 7)}`,
		card,
		description: _.get(message, ['data', 'payload', 'message']),
	};
};

export type OwnProps = LensRendererProps;
export interface StateProps {
	types: TypeContract[];
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

type Props = StateProps &
	DispatchProps &
	OwnProps &
	RouteComponentProps &
	Setup;

export default withSetup(
	class Kanban extends React.Component<Props, {}> {
		constructor(props: Props) {
			super(props);

			this.handleDragEnd = this.handleDragEnd.bind(this);
			this.onCardClick = this.onCardClick.bind(this);
		}

		onCardClick(cardId: string) {
			const card: Contract = _.find(this.props.tail, {
				id: cardId,
			})!;

			this.props.history.push(
				helpers.appendToChannelPath(this.props.channel, card),
			);
		}

		handleDragEnd(cardId: string, _sourceLaneId: string, targetLaneId: string) {
			const card = _.find(this.props.tail, {
				id: cardId,
			});
			if (!card) {
				console.warn(`Could not find card by id: ${cardId}`);
				return;
			}
			const activeSlice = _.get(this.props, [
				'subscription',
				'data',
				'activeSlice',
			]);
			const slices = this.getSlices();
			const slice: any =
				_.find(slices, {
					patch: activeSlice,
				}) || slices[0];
			if (!slice) {
				return;
			}
			const targetValue = _.find(slice.values, (value) => {
				return targetLaneId === `${slice.path}__${value}`;
			});
			if (!targetValue) {
				return;
			}

			const patch = helpers.patchPath(
				card,
				slice.path.replace(/properties\./g, ''),
				targetValue,
			);

			this.props.sdk.card
				.update(card.id, card.type, patch)
				.then(() => {
					this.props.analytics.track('element.update', {
						element: {
							type: card.type,
							id: card.id,
						},
					});
				})
				.catch((error) => {
					notifications.addNotification('danger', error.message);
				});
		}

		getSlices() {
			const head = this.props.card;
			// If the head contract is a view, use it to find the slices
			if (head && head.type.split('@')[0] === 'view') {
				const schema = {
					allOf: (head as any).data.allOf.map((block) => block.schema),
				};
				return helpers.getSchemaSlices(schema, this.props.types) || [];
			}
			// Otherwise spoof a schema
			if (this.props.tail && this.props.tail.length > 0) {
				const sample: any = _.first(this.props.tail);
				const schema: any = _.set(
					{},
					['properties', 'type', 'const'],
					sample.type,
				);
				return helpers.getSchemaSlices(schema, this.props.types) || [];
			}
			return [];
		}

		getLanes() {
			if (!this.props.tail || !this.props.tail.length) {
				return [];
			}
			let cards = this.props.tail.slice();
			const lanes: any[] = [];
			const slices = this.getSlices();
			slices.forEach((schema) => {
				if (typeof schema === 'boolean') {
					return;
				}
				// TODO: This is kind of dirty, we're chopping off the first half of the schema description
				// Ideally, the friendly value should be provided in the slice option
				const label = schema.description!.split(' is ').pop();
				const lane: any = {
					id: `${schema.description}`,
					cards: [],
					title: label,
					label: '(0)',
				};
				if (!cards.length) {
					lanes.push(lane);
					return;
				}
				const [slicedCards, remaining] = _.partition(cards, (card) => {
					return skhema.isValid(schema as any, card);
				});
				lane.cards = _.map(slicedCards, cardMapper);
				cards = remaining;
				lane.label = `(${lane.cards.length})`;
				lanes.push(lane);
			});

			// Handle leftover cards by adding them to a single column at the beginning
			// of the board
			if (cards.length) {
				lanes.unshift({
					id: UNSORTED_GROUP_ID,
					cards: cards.map(cardMapper),
				});
			}
			return lanes;
		}

		render() {
			const data = {
				lanes: this.getLanes(),
			};

			const components = {
				Card,
			};

			return (
				<TrelloWrapper data-test={`lens--${SLUG}`} flexDirection="column">
					<ReactTrello
						style={{
							padding: '0 12px',
							background: 'none',
						}}
						components={components}
						data={data}
						draggable={true}
						handleDragEnd={this.handleDragEnd}
						onCardClick={this.onCardClick}
					/>
				</TrelloWrapper>
			);
		}
	},
);
