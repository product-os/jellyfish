import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import Board, { BoardLane } from 'react-trello';
import { bindActionCreators } from 'redux';
import { Button, Flex, Modal } from 'rendition';
import styled from 'styled-components';
import * as jellyscript from '../../jellyscript';
import { Card, Channel, Lens, RendererProps, Type } from '../../Types';
import { CardCreator } from '../components/CardCreator';
import { ContextMenu } from '../components/ContextMenu';
import { GroupUpdate } from '../components/GroupUpdate';
import Icon from '../components/Icon';
import { sdk } from '../core';
import { actionCreators } from '../core/store';
import {
	createChannel,
	getUpdateObjectFromSchema,
	getViewSchema,
} from '../services/helpers';
import LensService from './index';

const UNSORTED_GROUP_ID = 'JELLYFISH_UNSORTED_GROUP';

const EllipsisButton = styled(Button)`
	float: right;
	color: #c3c3c3;

	&:hover,
	&:focus {
		color: white;
	}
`;

const cardMapper = (card: Card) => ({
	id: card.id,
	title: card.name || card.slug || card.id,
});

interface CustomLaneHeaderState {
	showMenu: boolean;
	showUpdateModal: boolean;
}

interface CustomLaneHeaderProps extends Partial<BoardLane> {
	schema: JSONSchema6;
}

class CustomLaneHeader extends React.Component<CustomLaneHeaderProps, CustomLaneHeaderState> {
	constructor(props: any) {
		super(props);

		this.state = {
			showMenu: false,
			showUpdateModal: false,
		};
	}

	public toggleMenu = () => {
		this.setState({ showMenu: !this.state.showMenu });
	}

	public toggleUpdateModal = () => {
		this.setState({ showUpdateModal: !this.state.showUpdateModal });
	}

	render() {
		const { props } = this;

		return (
			<div>
				{props.title}
				<EllipsisButton
					px={2}
					plaintext
					onClick={this.toggleMenu}
				>
					<Icon name="ellipsis-v" />
				</EllipsisButton>

				{this.state.showMenu &&
					<ContextMenu
						position="bottom"
						onClose={this.toggleMenu}
					>
						<Button
							plaintext
							onClick={this.toggleUpdateModal}
						>
							Update all items in this list
						</Button>
					</ContextMenu>
				}

				{this.state.showUpdateModal &&
					<GroupUpdate
						cards={props.cards!}
						schema={props.schema}
						onClose={this.toggleUpdateModal}
					/>
				}
			</div>
		);
	}
}

interface KanbanState {
	modalChannel: null | Channel;
	showNewCardModal: boolean;
	creatingCard: boolean;
}

interface KanbanProps extends RendererProps {
	subscription?: null | Card;
	type: null | Type;
	actions: typeof actionCreators;
}

class Kanban extends React.Component<KanbanProps, KanbanState> {
	constructor(props: KanbanProps) {
		super(props);

		this.state = {
			creatingCard: false,
			modalChannel: null,
			showNewCardModal: false,
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

		if (group.data.sort) {
			cards.sort((a, b) => {
				return jellyscript.evaluate(group.data.sort, { input: { a, b } }).value ?
					-1 : 1;
			});
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

		const targetSchema = _.find<JSONSchema6>(schemas, { title: targetLaneId });

		if (!targetSchema) {
			return;
		}

		const update = getUpdateObjectFromSchema(targetSchema);

		_.merge(card, update);

		if (!_.isEmpty(update)) {
			sdk.card.update(card.id, card)
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

	public toggleNewCardModal = () => {
		this.setState({ showNewCardModal: !this.state.showNewCardModal });
	}

	public getSeedData() {
		const { head } = this.props.channel.data;

		if (!head || head.type !== 'view') {
			return {};
		}

		const schema = getViewSchema(head);

		if (!schema) {
			return {};
		}

		return getUpdateObjectFromSchema(schema);
	}

	public clearModalChannel = () => {
		this.setState({ modalChannel: null });
	}

	public startCreatingCard = () => {
		this.setState({ showNewCardModal: false });
		this.setState({ creatingCard: true });
	}

	public doneCreatingCard = (card: Card | null) => {
		if (card) {
			this.setState({
				modalChannel: createChannel({
					target: card.id,
					head: card,
				}),
			});
		}
		this.setState({ creatingCard: false });
	}

	public cancelCreatingCard = () => {
		this.setState({
			showNewCardModal: false,
			creatingCard: false,
		});
	}


	public render() {
		const data = {
			lanes: this.getLanes(),
		};

		const { type } = this.props;

		const typeName = type ? type.name || type.slug : '';

		let lens;

		if (this.state.modalChannel) {
			const lenses = LensService.getLenses(this.state.modalChannel.data.head);

			lens = lenses[0];
		}

		return (
			<Flex flexDirection="column" style={{height: '100%', position: 'relative'}}>
				<Board
					style={{
						padding: '0 12px',
					}}
					customLaneHeader={type ? <CustomLaneHeader schema={type.data.schema} /> : undefined}
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
				{!!type &&
					<React.Fragment>
						<Button
							success={true}
							onClick={this.toggleNewCardModal}
							m={3}
							style={{
								position: 'absolute',
								bottom: 0,
								right: 0,
							}}
							disabled={this.state.creatingCard}
						>
							{this.state.creatingCard && <Icon name="cog fa-spin" />}
							{!this.state.creatingCard &&
								<span>Add a {typeName}</span>
							}
						</Button>

						<CardCreator
							seed={this.getSeedData()}
							show={this.state.showNewCardModal}
							type={type}
							onCreate={this.startCreatingCard}
							done={this.doneCreatingCard}
							cancel={this.toggleNewCardModal}
						/>
					</React.Fragment>
				}
			</Flex>
		);
	}
}

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

const lens: Lens = {
	slug: 'lens-kanban',
	type: 'lens',
	name: 'Kanban lens',
	data: {
		supportsGroups: true,
		icon: 'columns',
		renderer: connect(null, mapDispatchToProps)(Kanban),
		filter: {
			type: 'array',
		},
	},
};

export default lens;
