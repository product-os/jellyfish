import { circularDeepEqual } from 'fast-equals';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Button,
	Flex,
	Txt,
} from 'rendition';
import { Card, Lens, RendererProps, Type } from '../../Types';
import { CardCreator } from '../components/CardCreator';
import Icon from '../components/Icon';
import { actionCreators } from '../core/store';
import { createChannel, getUpdateObjectFromSchema, getViewSchema } from '../services/helpers';

interface DefaultListState {
	showNewCardModal: boolean;
	creatingCard: boolean;
}

interface DefaultListProps extends RendererProps {
	type: null | Type;
	actions: typeof actionCreators;
}

class DefaultList extends React.Component<DefaultListProps, DefaultListState> {
	constructor(props: DefaultListProps) {
		super(props);

		this.state = {
			showNewCardModal: false,
			creatingCard: false,
		};
	}

	public shouldComponentUpdate(nextProps: DefaultListProps, nextState: DefaultListState): boolean {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props);
	}

	public handleOpenChannel = (e: React.MouseEvent<HTMLAnchorElement>) => {
		const id = e.currentTarget.dataset.id;
		const card = _.find(this.props.tail, { id });
		if (!card) {
			return;
		}
		this.openChannel(card);
	}

	public openChannel(card: Card): void {
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
		const {
			tail,
			type,
			channel: {
				data: { head },
			},
		} = this.props;

		const typeName = type ? type.name || type.slug : '';

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
								<a
									data-id={card.id}
									onClick={this.handleOpenChannel}
									className={`list-item--${card.slug || card.id}`}
									href={`#${head!.id}/${card.id}`}
								>
									{card.name || card.slug || card.id}
								</a>
							</Box>
						);
					})}

					{!!tail && tail.length === 0 &&
							<Txt.p p={3}>No results found</Txt.p>
					}
				</Box>

				{!!type &&
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
									<span>Add a {typeName}</span>
								}
							</Button>
						</Flex>

						<CardCreator
							seed={this.getSeedData()}
							show={this.state.showNewCardModal}
							type={type}
							onCreate={this.startCreatingCard}
							done={this.doneCreatingCard}
							cancel={this.cancelCreatingCard}
						/>
					</React.Fragment>
				}
			</React.Fragment>
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
		renderer: connect(null, mapDispatchToProps)(DefaultList),
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
