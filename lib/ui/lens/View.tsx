import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Button,
	Divider,
	Filters,
	Flex,
	Form,
	Heading,
	Modal,
	SchemaSieve,
} from 'rendition';
import { Card, Lens, RendererProps, Type } from '../../Types';
import Icon from '../components/Icon';
import { createChannel } from '../services/helpers';
import { addCard, getTypeCard, JellyfishStream, streamQueryView } from '../services/sdk';
import { actionCreators } from '../services/store';
import LensService from './index';

interface ViewRendererState {
	filters: JSONSchema6[];
	showNewCardModal: boolean;
	newCardModel: {[key: string]: any };
	tail: null | Card[];
	lenses: Lens[];
	activeLens: null | Lens;
	tailType: Type | null;
}

interface ViewRendererProps extends RendererProps {
	actions: typeof actionCreators;
}

class ViewRenderer extends React.Component<ViewRendererProps, ViewRendererState> {
	private stream: JellyfishStream;

	constructor(props: ViewRendererProps) {
		super(props);

		this.state = {
			filters: [],
			showNewCardModal: false,
			newCardModel: {},
			tail: null,
			lenses: [],
			activeLens: null,
			tailType: null,
		};

		this.streamTail();
	}

	public componentWillUnmount() {
		this.stream.destroy();
	}

	public setTail(tail: Card[]) {
		const { head } = this.props.channel.data;

		let tailType: Type | null = null;

		if (tail && tail.length) {
			tailType = getTypeCard(tail[0].type) || null;
		}

		// If there is no tail, make a best guess at the type
		if (tail && !tail.length) {
			const foundType = _.get(head, 'data.allOf[0].schema.properties.type.const')
				|| _.get(head, 'data.oneOf[0].schema.properties.type.const');

			if (foundType) {
				tailType = getTypeCard(foundType) || null;
			}

		}

		const lenses: Lens[] = tail.length > 0 ?
			LensService.getLenses(tail)
			: LensService.getLensesByType(tailType ? tailType.slug : null);

		console.log(lenses);

		const activeLens = this.state.activeLens || lenses[0] || null;

		this.setState({
			tail,
			lenses,
			activeLens,
			tailType,
		});
	}

	public streamTail() {
		this.stream = streamQueryView(this.props.channel.data.target);

		this.stream.on('data', (response) => {
			this.setTail(response.data);
		});

		this.stream.on('update', (response) => {
			// If before is non-null then the card has been updated
			if (response.data.before) {
				return this.setState((prevState) => {
					if (prevState.tail) {
						const index = _.findIndex(prevState.tail, { id: response.data.before.id });
						prevState.tail.splice(index, 1, response.data.after);
					}
					return { tail: prevState.tail };
				});
			}

			const tail = this.state.tail || [];
			tail.push(response.data.after);

			this.setTail(tail);
		});
	}

	public addEntry(cardType: Type) {
		const newCard = {
			type: cardType.slug,
			...this.state.newCardModel,
		};

		addCard(newCard as Card);

		this.setState({
			showNewCardModal: false,
			newCardModel: {},
		});
	}

	public openChannel(card: Card) {
		this.props.actions.addChannel(createChannel({
			target: card.id,
			head: card,
			parentChannel: this.props.channel.id,
		}));
	}

	public render() {
		const { head } = this.props.channel.data;
		const { tail, tailType } = this.state;
		const useFilters = !!tailType && tailType.slug !== 'view';

		const { activeLens } = this.state;

		let filteredTail = tail;

		// TODO: This is terrible for performance, we should find a cleaner
		// way of filtering on a sub property. A `payloadKey` param for
		// SchemaSieve / Filters would be ideal.
		if (useFilters && tail) {
			filteredTail = tail.filter((card) =>
				SchemaSieve.filter(this.state.filters, [card.data]).length > 0);
		}

		console.log(filteredTail);
		console.log(this.state.lenses);

		return (
			<Box style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #ccc', minWidth: 450, position: 'relative' }}>
				{head &&
					<React.Fragment>
						<Flex justify='space-between' m={3}>
							<Heading.h4>{head.name}</Heading.h4>

						</Flex>

						{useFilters &&
							<Box mx={3} mb={2}>
								<Filters
									schema={(tailType as any).data.schema.properties.data}
									onFiltersUpdate={(filters) => this.setState({ filters })}
								/>
							</Box>
						}

						<Flex px={3} mb={2} justify='space-between'>
							{!!tailType &&
								<Button success onClick={() => this.setState({ showNewCardModal: true })}>
									Add a {tailType.name || tailType.slug}
								</Button>
							}
							<Box>
								{_.map(this.state.lenses, lens =>
									<Button
										key={lens.slug}
										bg={this.state.activeLens!.slug === lens.slug  ? '#333' : undefined}
										square
										onClick={() => this.setState({ activeLens: lens })}>
										<Icon name={lens.data.icon} />
									</Button>,
								)}
							</Box>
						</Flex>

						<Divider color='#ccc' />
					</React.Fragment>
				}
				<Box p={3}>
					{!tail && <Icon name='cog fa-spin' />}
				</Box>

				{(!!filteredTail && activeLens) && <activeLens.data.renderer
					channel={this.props.channel}
					tail={filteredTail}
					/>}

				{(this.state.showNewCardModal && !!tailType) &&
					<Modal
						title='Add entry'
						cancel={() => this.setState({ showNewCardModal: false })}
						done={() => !!tailType && this.addEntry(tailType)}>

						<Form
							schema={(tailType as any).data.schema}
							value={this.state.newCardModel}
							onChange={(data: any) => this.setState({ newCardModel: data.formData })}
							onSubmit={() => !!tailType && this.addEntry(tailType)}
						/>
					</Modal>
				}
			</Box>
		);
	}

}

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

const lens: Lens = {
	slug: 'lens-view',
	type: 'lens',
	name: 'View lens',
	data: {
		type: 'view',
		icon: 'filter',
		renderer: connect(null, mapDispatchToProps)(ViewRenderer),
		filter: {
			type: 'object',
			properties: {
				type: {
					const: 'view',
				},
			},
		},
	},
};

export default lens;
