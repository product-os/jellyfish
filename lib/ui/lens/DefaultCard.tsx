import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Button,
	Flex,
} from 'rendition';
import { Card, Lens, RendererProps, Type } from '../../Types';
import CardCreator from '../components/CardCreator';
import CardRenderer from '../components/CardRenderer';
import { createChannel } from '../services/helpers';
import { actionCreators } from '../services/store';

interface CardListState {
	showNewCardModal: boolean;
}

interface CardListProps extends RendererProps {
	actions: typeof actionCreators;
	type: Type;
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

	public render() {
		const { tail, channel: { data: { head } } } = this.props;

		return (
			<React.Fragment>
				<Box px={3} flex='1' style={{overflowY: 'auto'}}>
					{!!tail && _.map(tail, (card) => {
						// Don't show the card if its the head, this can happen on view types
						if (card.id === head!.id) {
							return null;
						}

						return (
							<CardRenderer
								key={card.id}
								card={card} />
						);
					})}
				</Box>

				<Flex p={3}
					style={{borderTop: '1px solid #eee'}}
					justify='flex-end'
				>
					<Button success onClick={() => this.setState({ showNewCardModal: true })}>
						Add a {this.props.type.name || this.props.type.slug}
					</Button>
				</Flex>

				<CardCreator
					show={this.state.showNewCardModal}
					type={this.props.type}
					done={() => this.setState({ showNewCardModal: false })}
				/>
			</React.Fragment>
		);
	}

}

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

const lens: Lens = {
	slug: 'lens-default-card',
	type: 'lens',
	name: 'Default card lens',
	data: {
		renderer: connect(null, mapDispatchToProps)(CardList),
		icon: 'address-card',
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
