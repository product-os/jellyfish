import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import Board, { BoardLane } from 'react-trello';
import { Flex, Modal } from 'rendition';
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

interface KanbanProps extends RendererProps, ConnectedComponentProps {
	subscription?: null | Card;
}

class Kanban extends React.Component<KanbanProps, KanbanState> {
	constructor(props: KanbanProps) {
		super(props);

		this.state = {
			modalChannel: null,
		};
	}

	public getGroups() {
		const view = this.props.channel.data.head;

		if (!view || !view.data.groups) {
			return [];
		}

		return view.data.groups;
	}

	public getLanes(): BoardLane[] {
		if (!this.props.tail || !this.props.tail.length) {
			return [];
		}
		const activeGroup = _.get(this.props, 'subscription.data.activeGroup');
		let cards = this.props.tail.slice();
		const lanes: BoardLane[] = [];
		const groups = this.getGroups();
		const group = _.find(groups, { slug: activeGroup }) || groups[0];

		if (!group) {
			return [];
		}

		const schemas = group.data.schemas;

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

		const activeGroup = _.get(this.props, 'subscription.data.activeGroup');
		const groups = this.getGroups();
		const group = _.find(groups, { slug: activeGroup }) || groups[0];

		if (!group) {
			return [];
		}

		const schemas = group.data.schemas;

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

	public clearModalChannel = () => {
		this.setState({ modalChannel: null });
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
			<Flex flexDirection="column" style={{height: '100%', position: 'relative'}}>
				<Board
					style={{padding: '0 16px', margin: '0 -5px'}}
					data={data}
					draggable={true}
					handleDragEnd={this.handleDragEnd}
					onCardClick={this.onCardClick}
				/>
				{!!this.state.modalChannel && !!lens &&
					<Modal w={960} done={this.clearModalChannel}>
						<lens.data.renderer channel={this.state.modalChannel} />
					</Modal>
				}
			</Flex>
		);
	}
}

const lens: Lens = {
	slug: 'lens-kanban',
	type: 'lens',
	name: 'Kanban lens',
	data: {
		supportsGroups: true,
		icon: 'columns',
		renderer: connectComponent(Kanban),
		filter: {
			type: 'array',
		},
	},
};

export default lens;
