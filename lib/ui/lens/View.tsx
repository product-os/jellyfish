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
	Heading,
	SchemaSieve,
} from 'rendition';
import { Card, Lens, RendererProps, Type } from '../../Types';
import Icon from '../components/Icon';
import { createChannel } from '../services/helpers';
import { getTypeCard, JellyfishStream, streamQueryView } from '../services/sdk';
import { actionCreators } from '../services/store';
import LensService from './index';

interface ViewRendererState {
	filters: JSONSchema6[];
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
			LensService.getLenses(tail, tailType ? tailType.data.lenses : undefined)
			: LensService.getLensesByType(tailType ? tailType.slug : null, tailType ? tailType.data.lenses : undefined);

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
			<Flex flexDirection='column' style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #ccc', minWidth: 450, position: 'relative' }}>
				{head &&
					<Box>
						<Heading.h4 m={3}>{head.name}</Heading.h4>

						{useFilters &&
							<Box mx={3} mb={2}>
								<Filters
									schema={(tailType as any).data.schema.properties.data}
									onFiltersUpdate={(filters) => this.setState({ filters })}
								/>
							</Box>
						}

						{this.state.lenses.length > 1 &&
							<Flex px={3} pb={2} justify='flex-end'>
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
						}

						<Divider color='#ccc' />
					</Box>
				}

				{!tail &&
					<Box p={3}>
						<Icon name='cog fa-spin' />
					</Box>
				}

				{(!!filteredTail && activeLens) && <activeLens.data.renderer
					channel={this.props.channel}
					tail={filteredTail}
					type={tailType}
					/>}
			</Flex>
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
