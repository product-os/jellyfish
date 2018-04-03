import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../services/store';
import {
	Box,
	Link,
} from 'rendition';
import { Card, Lens, RendererProps } from '../../Types';
import { createChannel } from '../services/helpers';

interface ViewListProps extends RendererProps {
	actions: typeof actionCreators;
}

class ViewList extends React.Component<ViewListProps, {}> {
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
						<Box key={card.id} mb={3}>
							<Link onClick={() => this.openChannel(card)}>{card.name || card.slug}</Link>
						</Box>
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
	slug: 'lens-default-list',
	type: 'lens',
	name: 'Default list lens',
	data: {
		renderer: connect(null, mapDispatchToProps)(ViewList),
		icon: 'list-ul',
		type: 'view',
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
