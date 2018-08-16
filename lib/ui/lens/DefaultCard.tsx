import { circularDeepEqual } from 'fast-equals';
import * as React from 'react';
import { connect } from 'react-redux';
import ResizeObserver from 'react-resize-observer';
import {
	AutoSizer,
	CellMeasurer,
	CellMeasurerCache,
	List,
	ListRowProps,
} from 'react-virtualized';
import { bindActionCreators } from 'redux';
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
import Icon from '../components/Icon';
import { actionCreators } from '../core/store';
import { createChannel, getUpdateObjectFromSchema, getViewSchema } from '../services/helpers';

const Column = styled(Flex)`
	height: 100%;
	min-width: 350px;
	overflow-y: auto;
`;

interface CardListState {
	showNewCardModal: boolean;
	creatingCard: boolean;
}

interface CardListProps extends RendererProps {
	actions: typeof actionCreators;
	type: null | Type;
}

class CardList extends React.Component<CardListProps, CardListState> {
	private _cache: CellMeasurerCache;

	constructor(props: CardListProps) {
		super(props);

		this.state = {
			creatingCard: false,
			showNewCardModal: false,
		};

		this._cache = new CellMeasurerCache({
			defaultHeight: 300,
			fixedWidth: true,
		});
	}

	public componentDidUpdate({ tail }: CardListProps) {
		// If tail data has changed, clear the cell cache
		if (!circularDeepEqual(this.props.tail, tail)) {
			this.clearCellCache();
		}
	}

	public clearCellCache = () => {
		this._cache.clearAll();
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

	public rowRenderer = (props: ListRowProps) => {
		const { tail, channel: { data: { head } } } = this.props;
		const card = tail![props.index];

		// Don't show the card if its the head, this can happen on view types
		if (card.id === head!.id) {
			return null;
		}

		return (
			<CellMeasurer
				cache={this._cache}
				columnIndex={0}
				key={card.id}
				overscanRowCount={10}
				parent={props.parent}
				rowIndex={props.index}
			>
				<Box px={3} style={props.style}>
					<CardRenderer
						key={card.id}
						card={card}
						channel={this.props.channel}
					/>
					<Divider color="#eee" m={0} style={{height: 1}} />
				</Box>
			</CellMeasurer>
		);
	}

	public render() {
		const { tail } = this.props;

		return (
			<Column flexDirection="column">
				<Box flex="1" style={{ position: 'relative' }}>
					<ResizeObserver onResize={this.clearCellCache} />
					{!!tail &&
						<AutoSizer>
							{({ width, height }) => (
								<List
									width={width}
									height={height}
									deferredMeasurementCache={this._cache}
									rowHeight={this._cache.rowHeight}
									rowRenderer={this.rowRenderer}
									rowCount={tail.length}
									onResize={this.clearCellCache}
									overscanRowCount={3}
								/>
							)}
						</AutoSizer>
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
									<span>Add a {this.props.type.name || this.props.type.slug}</span>
								}
							</Button>
						</Flex>

						<CardCreator
							seed={this.getSeedData()}
							show={this.state.showNewCardModal}
							type={this.props.type}
							onCreate={this.startCreatingCard}
							done={this.doneCreatingCard}

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
	slug: 'lens-default-card',
	type: 'lens',
	name: 'Default card lens',
	data: {
		renderer: connect(null, mapDispatchToProps)(CardList),
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
