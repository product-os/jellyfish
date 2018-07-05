import * as _ from 'lodash';
import * as React from 'react';
import {
	Box,
	Button,
	Divider,
	Flex,
} from 'rendition';
import styled from 'styled-components';
import { Card, Lens, RendererProps, Type } from '../../Types';
import { CardCreator } from '../components/CardCreator';
import { CardRenderer } from '../components/CardRenderer';
import { connectComponent, ConnectedComponentProps } from '../services/connector';
import { createChannel, getUpdateObjectFromSchema, getViewSchema } from '../services/helpers';

const Column = styled(Flex)`
	height: 100%;
	min-width: 350px;
	overflow-y: auto;
`;

interface CardListState {
	showNewCardModal: boolean;
}

interface CardListProps extends RendererProps, ConnectedComponentProps {
	type: null | Type;
}

class CardList extends React.Component<CardListProps, CardListState> {
	constructor(props: CardListProps) {
		super(props);

		this.state = {
			showNewCardModal: false,
		};
	}

	public openChannel(card: Card) {
		this.props.actions.addChannel(createChannel({
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

	public render() {
		const { tail, channel: { data: { head } } } = this.props;

		return (
			<Column flexDirection="column">
				<Box px={3} flex="1">
					{!!tail && _.map(tail, (card) => {
						// Don't show the card if its the head, this can happen on view types
						if (card.id === head!.id) {
							return null;
						}

						return (
							<React.Fragment>
								<CardRenderer
									key={card.id}
									card={card}
									channel={this.props.channel}
								/>
								<Divider color="#eee" m={0} style={{height: 1}} />
							</React.Fragment>
						);
					})}
				</Box>

				{!!this.props.type &&
					<React.Fragment>
						<Flex
							p={3}
							style={{borderTop: '1px solid #eee'}}
							justify="flex-end"
						>
							<Button success={true} onClick={this.showNewCardModal}>
								Add a {this.props.type.name || this.props.type.slug}
							</Button>
						</Flex>

						<CardCreator
							seed={this.getSeedData()}
							show={this.state.showNewCardModal}
							type={this.props.type}
							done={this.hideNewCardModal}
						/>
					</React.Fragment>
				}
			</Column>
		);
	}

}

const lens: Lens = {
	slug: 'lens-default-card',
	type: 'lens',
	name: 'Default card lens',
	data: {
		renderer: connectComponent(CardList),
		icon: 'address-card',
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
