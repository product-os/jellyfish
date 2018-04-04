import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../services/store';
import {
	Box,
} from 'rendition';
import { Card, Lens, RendererProps } from '../../Types';
import CardRenderer from '../components/CardRenderer';
import { createChannel } from '../services/helpers';

interface CardListProps extends RendererProps {
	actions: typeof actionCreators;
}

class CardList extends React.Component<CardListProps, {}> {
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
			<Box px={3}>
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
