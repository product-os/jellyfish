import * as _ from 'lodash';
import * as React from 'react';
import {
	Box,
	Button,
	Flex,
	Link,
} from 'rendition';
import { Lens, RendererProps, Type } from '../../Types';
import { CardCreator } from '../components/CardCreator';
import { connectComponent, ConnectedComponentProps } from '../services/connector';
import { createChannel, getUpdateObjectFromSchema, getViewSchema } from '../services/helpers';

interface ViewListState {
	showNewCardModal: boolean;
}

interface ViewListProps extends RendererProps, ConnectedComponentProps {
	type: null | Type;
}

class ViewList extends React.Component<ViewListProps, ViewListState> {
	constructor(props: ViewListProps) {
		super(props);

		this.state = {
			showNewCardModal: false,
		};
	}

	public openChannel = (e: React.MouseEvent<HTMLAnchorElement>) => {
		const id = e.currentTarget.dataset.id;
		const card = _.find(this.props.tail, { id });
		if (!card) {
			return;
		}
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
			<React.Fragment>
				<Box p={3} flex="1" style={{overflowY: 'auto'}}>
					{!!tail && _.map(tail, (card) => {
						// Don't show the card if its the head, this can happen on view types
						if (card.id === head!.id) {
							return null;
						}

						return (
							<Box key={card.id} mb={3}>
								<Link data-id={card.id} onClick={this.openChannel}>{card.name || card.slug || card.id}</Link>
							</Box>
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
			</React.Fragment>
		);
	}

}

const lens: Lens = {
	slug: 'lens-default-list',
	type: 'lens',
	name: 'Default list lens',
	data: {
		renderer: connectComponent(ViewList),
		icon: 'list-ul',
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
