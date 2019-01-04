import { circularDeepEqual } from 'fast-equals';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	Box,
	Button,
	Filters,
	FiltersView,
	Flex,
	SchemaSieve,
	Select,
} from 'rendition';
import { Card, Channel, Lens, RendererProps, Type } from '../../types';
import ButtonGroup from '../components/ButtonGroup';
import Icon from '../components/Icon';
import { If } from '../components/If';
import { analytics, sdk } from '../core';
import { actionCreators, selectors, StoreState } from '../core/store';
import {
	createChannel,
	getTypeFromViewCard,
	getViewSlices,
} from '../services/helpers';
import LensService from './index';

interface ViewRendererState {
	filters: JSONSchema6[];
	lenses: Lens[];
	ready: boolean;
	subscription: any;
	tailType: Type | null;
}

interface ViewRendererProps extends RendererProps {
	channels: Channel[];
	user: Card | null;
	types: Type[];
	tail: Card[] | null;
	actions: typeof actionCreators;
	flex: any;
}

const USER_FILTER_NAME = 'user-generated-filter';

class ViewRenderer extends React.Component<ViewRendererProps, ViewRendererState> {
	constructor(props: ViewRendererProps) {
		super(props);

		this.state = {
			filters: [],
			lenses: [],
			ready: false,
			tailType: null,
			subscription: {
				data: {},
			},
		};
	}

	componentDidMount(): void {
		this.bootstrap(this.props.channel);
	}

	bootstrap(channel: Channel): void {
		const { head, options } = channel.data;

		if (!this.props.user) {
			throw new Error('Cannot bootstrap a view without an active user');
		}

		if (!head) {
			return;
		}

		this.props.actions.clearViewData(head.id);

		const filters = head
			? _.map(_.filter(head.data.allOf, { name: USER_FILTER_NAME }), 'schema')
			: [];

		if (options && options.slice) {
			const { slice } = options;
			const filter = {
				name: USER_FILTER_NAME,
				title: 'is',
				description: `${slice.title} is ${slice.value}`,
				type: 'object',
				properties: {},
			};

			_.set(filter, slice.path, { const: slice.value });

			const keys = slice.path.split('.');

			// Make sure that "property" keys correspond with { type: 'object' },
			// otherwise the filter won't work
			while (keys.length) {
				if (keys.pop() === 'properties') {
					_.set(filter, keys.concat('type'), 'object');
				}
			}

			filters.push({
				anyOf: [ filter ],
			});

			this.loadViewWithFilters(head, filters);
		} else {
			this.props.actions.streamView(head.id);
			this.props.actions.loadViewResults(head.id);
		}

		const lenses = _.chain(head)
			.get('data.lenses')
			.map((slug: string) => LensService.getLensBySlug(slug))
			.compact()
			.value();

		const tailType = _.find(this.props.types, { slug: getTypeFromViewCard(head) }) || null;

		// set default state
		this.setState({
			filters,
			lenses,
			tailType,
			// mark as ready
			ready: true,
		});
	}

	public componentWillReceiveProps(nextProps: ViewRendererProps): void {
		if (this.props.channel.data.target !== nextProps.channel.data.target) {
			this.setState({ ready: false });
		}

		if (!circularDeepEqual(this.props.channel.data.target, nextProps.channel.data.target)) {
			this.bootstrap(nextProps.channel);
		}

		if (!this.props.channel.data.head && nextProps.channel.data.head) {
			// Convert jellyfish view into a format that rendition can understand
			this.setState({
				filters: _.map(_.filter(nextProps.channel.data.head.data.allOf, { name: USER_FILTER_NAME }), (item: any) => {
					return {
						anyOf: [ item.schema ],
					};
				}),
			});
		}
	}

	public openChannel(card: Card): void {
		this.props.actions.addChannel(createChannel({
			cardType: card!.type,
			target: card.id,
			head: card,
			parentChannel: this.props.channel.id,
		}));
	}

	public saveView = ([ view ]: FiltersView[]): void => {
		sdk.card.create(this.createView(view))
		.then((view) => {
			analytics.track('element.create', {
				element: {
					type: 'view',
				},
			});

			this.props.actions.addChannel(createChannel({
				cardType: 'view',
				target: view.id,
				head: view,
				parentChannel: this.props.channels[0].id,
			}));
		})
		.catch((error) => {
			this.props.actions.addNotification('danger', error.message);
		});
	}

	public createView(view: FiltersView): Card {
		const newView = _.cloneDeep(this.props.channel.data.head!);
		const { user } = this.props;

		newView.name = view.name;
		newView.slug = 'view-user-created-view-' + sdk.utils.slugify(view.name);

		if (!newView.data.allOf) {
			newView.data.allOf = [];
		}

		newView.data.allOf = _.reject(newView.data.allOf, { name: USER_FILTER_NAME });

		newView.data.actor = user!.id;

		newView.markers = [ user!.slug ];

		view.filters.forEach((filter) => {
			newView.data.allOf.push({
				name: USER_FILTER_NAME,
				schema: _.assign(SchemaSieve.unflattenSchema(filter), { type: 'object' }),
			});
		});

		delete newView.id;
		delete newView.created_at;

		return newView;
	}

	public updateFilters = _.debounce((filters: JSONSchema6[]) => {
		const { head } = this.props.channel.data;

		if (head) {
			this.loadViewWithFilters(head, filters);
		}

		this.setState({ filters });
	}, 350);

	public loadViewWithFilters(view: Card, filters: JSONSchema6[]): void {
		const syntheticViewCard = _.cloneDeep(view);
		const originalFilters = view
			? _.reject(view.data.allOf, { name: USER_FILTER_NAME })
			: [];

		syntheticViewCard.data.allOf = originalFilters;

		filters.forEach((filter) => {
			syntheticViewCard.data.allOf.push({
				name: USER_FILTER_NAME,
				schema: _.assign(_.omit(filter, '$id'), { type: 'object' }),
			});
		});

		this.props.actions.clearViewData(syntheticViewCard);
		this.props.actions.loadViewResults(syntheticViewCard);
		this.props.actions.streamView(syntheticViewCard);
	}

	public setLens = (e: React.MouseEvent<HTMLButtonElement>): void => {
		const slug = e.currentTarget.dataset.slug;
		const lens = _.find(this.state.lenses, { slug });
		const { subscription } = this.state;

		if (!subscription || !lens) {
			return;
		}

		subscription.data.activeLens = lens.slug;
		this.setState({ subscription });
	}

	public setSlice = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const { subscription } = this.state;

		if (!subscription) {
			return;
		}

		const slug = e.target.value;
		subscription.data.activeSlice = slug;
		this.setState({ subscription });
	}

	render(): React.ReactNode {
		const { head } = this.props.channel.data;
		if (!this.state.ready || !head || _.isEmpty(head.data)) {
			return (
				<Box p={3}>
					<i className="fas fa-cog fa-spin" />
				</Box>
			);
		}
		const { tail, types } = this.props;
		const { tailType, lenses, subscription } = this.state;
		const useFilters = !!tailType && tailType.slug !== 'view';
		const activeLens = _.find(lenses, { slug: _.get(subscription, 'data.activeLens') }) || lenses[0];
		const slices = getViewSlices(head, types);
		const lensSupportsSlices = !!activeLens && !!activeLens.data.supportsSlices;

		return (
			<Flex
				flex={this.props.flex}
				className={`column--${head ? head.slug || head.type : 'unknown'}`}
				flexDirection="column"
				style={{ height: '100%', overflowY: 'auto', position: 'relative' }}
			>
				<If condition={!!head}>
					<Box>
						<Flex mt={3} justify="space-between">
							<Box flex="1" mx={3}>
								<If condition={useFilters}>
									<Box mt={0} flex="1 0 auto">
										<Filters
											schema={(tailType as any).data.schema}
											filters={this.state.filters}
											onFiltersUpdate={this.updateFilters}
											onViewsUpdate={this.saveView}
											renderMode={['add', 'search']}
										/>
									</Box>

								</If>
							</Box>

							<Flex mx={3}>
								<If condition={this.state.lenses.length > 1 && !!activeLens}>
									<ButtonGroup>
										{_.map(this.state.lenses, lens =>
											<Button
												key={lens.slug}
												bg={activeLens && activeLens.slug === lens.slug  ? '#333' : undefined}
												square={true}
												data-slug={lens.slug}
												onClick={this.setLens}
											>
												<Icon name={lens.data.icon} />
											</Button>,
										)}
									</ButtonGroup>
								</If>
								{slices && slices.length > 0 && lensSupportsSlices &&
									<Box ml={3}>
										Slice by:
										<Select
											ml={2}
											value={_.get(subscription, ['data', 'activeSlice'])}
											onChange={lensSupportsSlices ? this.setSlice : _.noop}
										>
											{_.map(slices, (slice: any) => {
												return (
													<option
														key={slice.path}
														value={slice.path}
													>
														{slice.title}
													</option>
												);
											})}
										</Select>
									</Box>
								}
							</Flex>
						</Flex>

						<If condition={useFilters && this.state.filters.length > 0}>
							<Box flex="1 0 auto" mb={3} mx={3}>
								<Filters
									schema={(tailType as any).data.schema}
									filters={this.state.filters}
									onFiltersUpdate={this.updateFilters}
									onViewsUpdate={this.saveView}
									renderMode={['summary']}
								/>
							</Box>
						</If>
					</Box>
				</If>

				<Flex style={{height: '100%', minHeight: 0}}>
					<If condition={!tail}>
						<Box p={3}>
							<Icon name="cog fa-spin" />
						</Box>
					</If>

					{!!tail && !!activeLens &&
						<activeLens.data.renderer
							channel={this.props.channel}
							tail={tail}
							type={tailType}
							subscription={subscription}
						/>
					}
				</Flex>
			</Flex>
		);
	}
}

const mapStateToProps = (state: StoreState, ownProps: ViewRendererProps) => {
	const target = ownProps.channel.data.target;
	return {
		channels: selectors.getChannels(state),
		tail: selectors.getViewData(state, target),
		types: selectors.getTypes(state),
		user: selectors.getCurrentUser(state),
	};
};

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

const lens: Lens = {
	slug: 'lens-view',
	type: 'lens',
	version: '1.0.0',
	name: 'View lens',
	data: {
		type: 'view',
		icon: 'filter',
		renderer: connect(mapStateToProps, mapDispatchToProps)(ViewRenderer as any),
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
