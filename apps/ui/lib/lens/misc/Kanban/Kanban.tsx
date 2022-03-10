import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import ReactTrello from 'react-trello';
import { Flex } from 'rendition';
import skhema from 'skhema';
import * as notifications from '../../../services/notifications';
import * as helpers from '../../../services/helpers';
import { analytics, sdk } from '../../../core';

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

const cardMapper = (card) => {
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

export default class Kanban extends React.Component<any, any> {
	constructor(props) {
		super(props);

		this.openCreateChannel = this.openCreateChannel.bind(this);
		this.handleDragEnd = this.handleDragEnd.bind(this);
		this.onCardClick = this.onCardClick.bind(this);
	}

	openCreateChannel() {
		const {
			type,
			actions,
			channel: {
				data: { head },
			},
		} = this.props;
		actions.openCreateChannel(head, type);
	}

	onCardClick(cardId) {
		const card = _.find(this.props.tail, {
			id: cardId,
		});

		this.props.history.push(
			helpers.appendToChannelPath(this.props.channel, card),
		);
	}

	handleDragEnd(cardId, _sourceLaneId, targetLaneId) {
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

		sdk.card
			.update(card.id, card.type, patch)
			.then(() => {
				analytics.track('element.update', {
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
		const head = this.props.channel.data.head;
		// If the head contract is a view, use it to find the slices
		if (head && head.type.split('@')[0] === 'view') {
			return helpers.getViewSlices(head, this.props.types) || [];
		}
		// Otherwise spoof a view
		if (this.props.tail && this.props.tail.length > 0) {
			const sample: any = _.first(this.props.tail);
			const fakeView: any = {
				data: {
					allOf: [
						_.set({}, ['schema', 'properties', 'type', 'const'], sample.type),
					],
				},
			};
			return helpers.getViewSlices(fakeView, this.props.types) || [];
		}
		return [];
	}

	getLanes() {
		if (!this.props.tail || !this.props.tail.length) {
			return [];
		}
		const activeSlice = _.get(this.props, [
			'subscription',
			'data',
			'activeSlice',
		]);
		let cards = this.props.tail.slice();
		const lanes: any[] = [];
		const slices = this.getSlices();
		const slice =
			_.find(slices, {
				path: activeSlice,
			}) || slices[0];
		if (!slice) {
			return [
				{
					id: UNSORTED_GROUP_ID,
					cards: cards.map(cardMapper),
				},
			];
		}
		slice.values.forEach((value, index) => {
			const lane: any = {
				id: `${slice.path}__${value}`,
				cards: [],
				title: slice.names ? slice.names[index] : value,
			};
			if (!cards.length) {
				lanes.push(lane);
				return;
			}
			const schema: any = _.set(
				{
					type: 'object',
				},
				slice.path,
				{
					const: value,
				},
			);
			const [slicedCards, remaining] = _.partition(cards, (card) => {
				return skhema.isValid(schema, card);
			});
			lane.cards = _.map(slicedCards, cardMapper);
			cards = remaining;
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

		const components = {};

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
}
