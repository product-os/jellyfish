/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Button,
	Flex,
	Link,
	Table,
	Txt,
} from 'rendition';
import styled from 'styled-components';
import { CardCreator } from '../components/CardCreator';
import Icon from '../components/Icon';
import { actionCreators } from '../core/store';
import { createChannel, getUpdateObjectFromSchema, getViewSchema } from '../services/helpers';
import { Card, Lens, RendererProps, Type } from '../types';

const Column = styled(Flex)`
	height: 100%;
	min-width: 330px;
	overflow-y: auto;
`;

const COLUMNS = [
	{
		field: 'name',
		sortable: true,
		render: (value: string) => {
			return <Link>{value}</Link>;
		},
	},
	{
		field: 'Created',
		sortable: true,
	},
	{
		field: 'Last updated',
		sortable: true,
	},
];

interface CardTableState {
	showNewCardModal: boolean;
	creatingCard: boolean;
}

interface CardTableProps extends RendererProps {
	actions: typeof actionCreators;
	type: null | Type;
}

class CardTable extends React.Component<CardTableProps, CardTableState> {
	constructor(props: CardTableProps) {
		super(props);

		this.state = {
			creatingCard: false,
			showNewCardModal: false,
		};
	}

	public openChannel(card: Card): void {
		this.props.actions.addChannel(createChannel({
			cardType: card!.type,
			target: card.id,
			head: card,
			parentChannel: this.props.channel.id,
		}));
	}

	public showNewCardModal = () => {
		this.setState({ showNewCardModal: true });
	}

	public hideNewCardModal = () => {
		this.setState({ showNewCardModal: false });
	}

	public startCreatingCard = () => {
		this.hideNewCardModal();
		this.setState({ creatingCard: true });
	}

	public doneCreatingCard = (card: Card | null) => {
		if (card) {
			this.openChannel(card);
		}
		this.setState({ creatingCard: false });
	}

	public cancelCreatingCard = () => {
		this.hideNewCardModal();
		this.setState({ creatingCard: false });
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

	public render(): React.ReactNode {
		const tail = this.props.tail ? _.map(this.props.tail, (card) => {
			const update = _.find(_.get(card, [ 'links', 'has attached element' ]), { type: 'update' }) as any;

			return {
				name: card.name,
				id: card.id,
				Created: card.created_at,
				'Last updated': _.get(update, [ 'data', 'timestamp' ], null),
			};
		}) : null;

		return (
			<Column flex="1" flexDirection="column">
				<Box flex="1" style={{ position: 'relative' }}>
					{!!tail && tail.length > 0 && (
						<Table
							rowKey="id"
							data={tail as any}
							columns={COLUMNS as any}
							onRowClick={({ id }) => this.openChannel(_.find(this.props.tail, { id })!)}
						/>
					)}
					{!!tail && tail.length === 0 &&
							<Txt.p p={3}>No results found</Txt.p>
					}
				</Box>

				{!!this.props.type &&
					<React.Fragment>
						<Flex
							p={3}
							style={{borderTop: '1px solid #eee'}}
							justify="flex-end"
						>
							<Button
								success={true}
								onClick={this.showNewCardModal}
								disabled={this.state.creatingCard}
							>
								{this.state.creatingCard && <Icon name="cog fa-spin" />}
								{!this.state.creatingCard &&
									<span>Add {this.props.type.name || this.props.type.slug}</span>
								}
							</Button>
						</Flex>

						<CardCreator
							seed={this.getSeedData()}
							show={this.state.showNewCardModal}
							type={this.props.type}
							onCreate={this.startCreatingCard}
							done={this.doneCreatingCard}
							cancel={this.cancelCreatingCard}
						/>
					</React.Fragment>
				}
			</Column>
		);
	}
}

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

const lens: Lens = {
	slug: 'lens-table',
	type: 'lens',
	version: '1.0.0',
	name: 'Default table lens',
	data: {
		renderer: connect(null, mapDispatchToProps)(CardTable),
		icon: 'table',
		type: '*',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					slug: {
						type: 'string',
					},
				},
			},
		},
	},
};

export default lens;
