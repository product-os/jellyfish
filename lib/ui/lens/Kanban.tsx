import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import Board, { BoardLane } from 'react-trello';
import { Box, Modal } from 'rendition';
import { Card, Channel, Lens, RendererProps } from '../../Types';
import { sdk } from '../app';
import { connectComponent, ConnectedComponentProps, createChannel } from '../services/helpers';
import LensService from './index';

const UNSORTED_GROUP_ID = 'JELLYFISH_UNSORTED_GROUP';

const cardMapper = (card: Card) => ({
	id: card.id,
	title: card.name || card.slug || card.id,
});

interface KanbanState {
	modalChannel: null | Channel;
}

interface DefaultRendererProps extends RendererProps, ConnectedComponentProps {}

class Kanban extends React.Component<DefaultRendererProps, KanbanState> {
	constructor(props: DefaultRendererProps) {
		super(props);

		this.state = {
			modalChannel: null,
		};
	}

	public getLanes(): BoardLane[] {
		if (!this.props.tail || !this.props.tail.length) {
			return [];
		}
		let cards = this.props.tail.slice();
		const lanes: BoardLane[] = [];
		const view = this.props.channel.data.head;
		const groupIndex = 0;

		if (!view || !view.data.groups) {
			return [];
		}

		const schemas = view.data.groups[groupIndex].schemas;

		schemas.forEach((schema: JSONSchema6) => {
			const lane: BoardLane = {
				id: schema.title || '',
				cards: [],
				title: schema.title,
			};

			if (!cards.length) {
				lanes.push(lane);

				return;
			}

			const validator = sdk.utils.compileSchema(schema);

			const [ groupedCards, remaining ] = _.partition(cards, (card) => {
				return validator(card);
			});

			lane.cards = _.map(groupedCards, cardMapper);

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

	public handleDragEnd = (cardId: string, _sourceLaneId: string, targetLaneId: string) => {
		const card = _.find(this.props.tail, { id: cardId });
		if (!card) {
			console.warn(`Could not find card by id: ${cardId}`);
			return;
		}

		const view = this.props.channel.data.head;
		const groupIndex = 0;

		if (!view || !view.data.groups) {
			return [];
		}

		const schemas = view.data.groups[groupIndex].schemas;

		const targetSchema = _.find(schemas, { title: targetLaneId });

		// Find possible update values for card
		// TODO: Make this function recurse through each level of the schema
		// Currently this assumes a schema of pattern:
		// PROPERTY: { const: VALUE }
		const update: { [k: string]: any } = {};
		_.forEach(_.get(targetSchema, 'properties.data.properties'), (value, key) => {
			update[key] = value.const;
		});

		if (!_.isEmpty(update)) {
			sdk.card.update(card.id, {
				data: update,
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message);
			});
		}
	}

	public onCardClick = (cardId: string) => {
		const card = _.find(this.props.tail, { id: cardId });

		this.setState({
			modalChannel: createChannel({
				target: cardId,
				head: card,
			}),
		});
	}

	public render() {
		const data = {
			lanes: this.getLanes(),
		};

		let lens;

		if (this.state.modalChannel) {
			const lenses = LensService.getLenses(this.state.modalChannel.data.head);

			lens = lenses[0];
		}

		return (
			<Box style={{height: '100%', position: 'relative'}}>
				<Board
					style={{height: '100%'}}
					data={data}
					draggable
					handleDragEnd={this.handleDragEnd}
					onCardClick={this.onCardClick} />
				{!!this.state.modalChannel && !!lens &&
					<Modal w={960} done={() => this.setState({ modalChannel: null })}>
						<lens.data.renderer channel={this.state.modalChannel} />
					</Modal>
				}
			</Box>
		);
	}
}

const lens: Lens = {
	slug: 'lens-kanban',
	type: 'lens',
	name: 'Kanban lens',
	data: {
		icon: 'columns',
		renderer: connectComponent(Kanban),
		filter: {
			type: 'array',
		},
	},
};

export default lens;
