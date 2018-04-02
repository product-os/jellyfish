import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import {
	Box,
	Button,
	Divider,
	Filters,
	Flex,
	Form,
	Heading,
	Link,
	Modal,
	SchemaSieve,
} from 'rendition';
import { Card, RendererProps, Type } from '../../Types';
import { addCard, getTypeCard } from '../services/sdk';
import CardRenderer from './CardRenderer';

interface ViewRendererState {
	filters: JSONSchema6[];
	showNewCardModal: boolean;
	newCardModel: {[key: string]: any };
}

export default class ViewRenderer extends React.Component<RendererProps, ViewRendererState> {
	constructor(props: RendererProps) {
		super(props);

		this.state = {
			filters: [],
			showNewCardModal: false,
			newCardModel: {},
		};
	}

	public addEntry(cardType: Type) {
		const newCard = {
			type: cardType.slug,
			...this.state.newCardModel,
		};

		addCard(newCard as Card)
		.then(() => this.props.refresh());

		this.setState({
			showNewCardModal: false,
			newCardModel: {},
		});
	}

	public open(card: Card) {
		this.props.openChannel({
			card: card.slug || card.id,
			type: card.type,
		});
	}

	public render() {
		const { head, tail } = this.props.channel.data;
		let tailType: Type | null = null;

		if (tail && tail.length) {
			tailType = getTypeCard(tail[0].type) || null;
		}

		// If there is no tail, make a best guess at the type
		if (tail && !tail.length) {
			const foundType = _.get(head, 'data.allOf[0].schema.properties.type.const')
				|| _.get(head, 'data.oneOf[0].schema.properties.type.const');

			console.log('FOUND TYPE', foundType);

			if (foundType) {
				tailType = getTypeCard(foundType) || null;
			}
		}

		const useFilters = !!tailType && tailType.slug !== 'view';

		return (
			<Box style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #ccc', minWidth: 270 }}>
				{head &&
					<React.Fragment>
						<Flex justify='space-between' m={3}>
							<Heading.h4>{head.name}</Heading.h4>

							{!!tailType &&
								<Button success onClick={() => this.setState({ showNewCardModal: true })}>
									Add a {tailType.name || tailType.slug}
								</Button>
							}
						</Flex>

						{useFilters &&
							<Box mx={3} mb={2}>
								<Filters
									schema={(tailType as any).data.schema.properties.data}
									onFiltersUpdate={(filters) => this.setState({ filters })}
								/>
							</Box>
						}
						<Divider color='#ccc' />
					</React.Fragment>
				}
				<Box p={3} mt={3}>
					{_.map(tail, (card) => {
						// A view shouldn't be able to display itself
						if (card.id === head!.id) {
							return null;
						}

						// TODO: This is terrible for performance, we should find a cleaner
						// way of filtering on a sub property. A `payloadKey` param for
						// SchemaSieve / Filters would be ideal.
						if (useFilters && SchemaSieve.filter(this.state.filters, [card.data]).length === 0) {
							return null;
						}

						if (card.type === 'view') {
							return (
								<Box key={card.id} mb={3}>
									<Link onClick={() => this.open(card)}>{card.name}</Link>
								</Box>
							);
						}

						return <CardRenderer
							key={card.id}
							card={card}
							refresh={this.props.refresh} />;
					})}
				</Box>

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
