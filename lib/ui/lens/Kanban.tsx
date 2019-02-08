/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import Board, { BoardLane } from 'react-trello';
import { bindActionCreators } from 'redux';
import { Button, Flex, Modal } from 'rendition';
import styled from 'styled-components';
import { CardCreator } from '../components/CardCreator';
import { ContextMenu } from '../components/ContextMenu';
import { GroupUpdate } from '../components/GroupUpdate';
import { analytics, sdk } from '../core';
import { actionCreators, selectors, StoreState } from '../core/store';
import {
	createChannel,
	getUpdateObjectFromSchema,
	getViewSchema,
	getViewSlices,
} from '../services/helpers';
import { Card, Channel, Lens, RendererProps, Type } from '../types';
import LensService from './index';

import Icon from '../shame/Icon';

const UNSORTED_GROUP_ID = 'JELLYFISH_UNSORTED_GROUP';

const EllipsisButton = styled(Button)`
	float: right;
	color: #c3c3c3;

	&:hover,
	&:focus {
		color: white;
	}
`;

const cardMapper = (card: Card) => {
	const message = _.find(_.get(card, [ 'links', 'has attached element' ]), { type: 'message' });

	return {
		id: card.id,
		type: card.type,
		title: card.name || card.slug || `${card.type}: ${card.id.substr(0, 7)}`,
		description: _.get(message, [ 'data', 'payload', 'message' ]),
	};
};

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

	render(): React.ReactNode {
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
	types: Type[];
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

	public getSlices(): any[] {
		const view = this.props.channel.data.head;

		if (!view) {
			return [];
		}

		return getViewSlices(view, this.props.types) || [];
	}

	public getLanes(): BoardLane[] {
		if (!this.props.tail || !this.props.tail.length) {
			return [];
		}
		const activeSlice = _.get(this.props, 'subscription.data.activeSlice');
		let cards = this.props.tail.slice();
		const lanes: BoardLane[] = [];
		const slices = this.getSlices();
		const slice: any = _.find(slices, { path: activeSlice }) || slices[0];

		if (!slice) {
			return [];
		}

		slice.values.forEach((value: any) => {
			const lane: BoardLane = {
				id: `${slice.path}__${value}`,
				cards: [],
				title: `${slice.title}: ${value}`,
			};

			if (!cards.length) {
				lanes.push(lane);

				return;
			}

			const schema = _.set({
				type: 'object',
			}, slice.path, { const: value });

			const validator = sdk.utils.compileSchema(schema as any);

			const [ slicedCards, remaining ] = _.partition(cards, (card) => {
				return validator(card);
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

	public handleDragEnd = (cardId: string, _sourceLaneId: string, targetLaneId: string) => {
		const card = _.find(this.props.tail, { id: cardId });
		if (!card) {
			console.warn(`Could not find card by id: ${cardId}`);
			return;
		}

		const activeSlice = _.get(this.props, 'subscription.data.activeSlice');
		const slices = this.getSlices();
		const slice = _.find(slices, { patch: activeSlice }) || slices[0];

		if (!slice) {
			return;
		}

		const targetValue = _.find(slice.values, (value) => {
			return targetLaneId === `${slice.path}__${value}`;
		});

		if (!targetValue) {
			return;
		}

		_.set(card, slice.path.replace(/properties\./g, ''), targetValue);

		sdk.card.update(card.id, card)
		.then(() => {
			analytics.track('element.update', {
				element: {
					type: card.type,
					id: card.id,
				},
			});
		})
		.catch((error) => {
			this.props.actions.addNotification('danger', error.message);
		});
	}

	public onCardClick = (cardId: string) => {
		const card = _.find(this.props.tail, { id: cardId });

		this.setState({
			modalChannel: createChannel({
				target: cardId,
				cardType: card!.type,
				head: card,
			}),
		});
	}

	public toggleNewCardModal = () => {
		this.setState({ showNewCardModal: !this.state.showNewCardModal });
	}

	public getSeedData(): { [k: string]: any } {
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
					cardType: card.type,
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


	public render(): React.ReactNode {
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
			<Flex flexDirection="column" style={{height: '100%', width: '100%', position: 'relative'}}>
				<Board
					style={{
						padding: '0 12px',
						background: 'none',
					}}
					customLaneHeader={type ? <CustomLaneHeader schema={type.data.schema} /> : undefined}
					data={data}
					draggable={true}
					handleDragEnd={this.handleDragEnd}
					onCardClick={this.onCardClick}
				/>
				{!!this.state.modalChannel && !!lens &&
					<Modal w={960} done={this.clearModalChannel}>
						<lens.data.renderer channel={this.state.modalChannel} card={this.state.modalChannel.data.head} />
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
								<span>Add {typeName}</span>
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

const mapStateToProps = (state: StoreState) => {
	return {
		types: selectors.getTypes(state),
	};
};


const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

const lens: Lens = {
	slug: 'lens-kanban',
	type: 'lens',
	version: '1.0.0',
	name: 'Kanban lens',
	data: {
		supportsSlices: true,
		icon: 'columns',
		renderer: connect(mapStateToProps, mapDispatchToProps)(Kanban),
		filter: {
			type: 'array',
		},
	},
};

export default lens;
