import { circularDeepEqual } from 'fast-equals';
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
	FiltersView,
	Flex,
	SchemaSieve,
	Select,
} from 'rendition';
import { Card, Channel, Lens, RendererProps, Type } from '../../Types';
import ButtonGroup from '../components/ButtonGroup';
import ChannelRenderer from '../components/ChannelRenderer';
import Icon from '../components/Icon';
import { If } from '../components/If';
import { sdk } from '../core/sdk';
import { actionCreators, selectors, StoreState } from '../core/store';
import {
	createChannel,
	getTypeFromViewCard,
} from '../services/helpers';
import LensService from './index';

interface ViewRendererState {
	filters: JSONSchema6[];
	lenses: Lens[];
	ready: boolean;
	tailType: Type | null;
}

interface ViewRendererProps extends RendererProps {
	channels: Channel[];
	user: Card | null;
	types: Type[];
	tail: Card[] | null;
	subscription: null | Card;
	actions: typeof actionCreators;
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
		};
	}

	componentDidMount() {
		this.bootstrap(this.props.channel.data.head);
	}

	bootstrap(head?: Card) {
		if (!this.props.user) {
			throw new Error('Cannot bootstrap a view without an active user');
		}

		if (!head) {
			return;
		}

		this.props.actions.streamView(head.id);
		this.props.actions.loadViewResults(head.id);

		this.props.actions.addSubscription(head.id);

		const filters = head
			? _.map(_.filter(head.data.allOf, { name: USER_FILTER_NAME }), 'schema')
			: [];

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

	public getGroups() {
		const view = this.props.channel.data.head;

		if (!view || !view.data.groups) {
			return [];
		}

		return view.data.groups;
	}

	public componentWillReceiveProps(nextProps: ViewRendererProps) {
		if (this.props.channel.data.target !== nextProps.channel.data.target) {
			this.setState({ ready: false });
		}

		if (!circularDeepEqual(this.props.channel.data.head, nextProps.channel.data.head)) {
			this.bootstrap(nextProps.channel.data.head);
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

	public openChannel(card: Card) {
		this.props.actions.addChannel(createChannel({
			target: card.id,
			head: card,
			parentChannel: this.props.channel.id,
		}));
	}

	public saveView = ([ view ]: FiltersView[]) => {
		sdk.card.create(this.createView(view))
		.then(
			(view) => this.props.actions.addChannel(createChannel({
				target: view.id,
				head: view,
				parentChannel: this.props.channels[0].id,
			})),
		)
		.catch((error) => {
			this.props.actions.addNotification('danger', error.message);
		});
	}

	public createView(view: FiltersView) {
		const newView = _.cloneDeep(this.props.channel.data.head!);

		newView.name = view.name;
		newView.slug = 'view-user-created-view-' + sdk.utils.slugify(view.name);

		if (!newView.data.allOf) {
			newView.data.allOf = [];
		}

		newView.data.allOf = _.reject(newView.data.allOf, { name: USER_FILTER_NAME });

		newView.data.actor = this.props.user!.id;

		view.filters.forEach((filter) => {
			newView.data.allOf.push({
				name: USER_FILTER_NAME,
				schema: _.assign(SchemaSieve.unflattenSchema(filter), { type: 'object' }),
			});
		});

		delete newView.id;

		return newView;
	}

	public updateFilters = _.debounce((filters: JSONSchema6[]) => {
		const { head } = this.props.channel.data;

		if (head) {
			const syntheticViewCard = _.cloneDeep(head);
			const originalFilters = head
				? _.reject(head.data.allOf, { name: USER_FILTER_NAME })
				: [];

			syntheticViewCard.data.allOf = originalFilters;

			filters.forEach((filter) => {
				syntheticViewCard.data.allOf.push({
					name: USER_FILTER_NAME,
					schema: _.assign(_.omit(filter, '$id'), { type: 'object' }),
				});
			});

			this.props.actions.loadViewResults(syntheticViewCard);
			this.props.actions.streamView(syntheticViewCard);
		}

		this.setState({ filters });
	}, 750, { leading: true });

	public setLens = (e: React.MouseEvent<HTMLButtonElement>) => {
		const slug = e.currentTarget.dataset.slug;
		const lens = _.find(this.state.lenses, { slug });
		const { subscription } = this.props;

		if (!subscription || !lens) {
			return;
		}

		subscription.data.activeLens = lens.slug;

		this.props.actions.saveSubscription(subscription, this.props.channel.data.target);
	}

	public setGroup = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const { subscription } = this.props;

		if (!subscription) {
			return;
		}

		const slug = e.target.value;
		subscription.data.activeGroup = slug;

		this.props.actions.saveSubscription(subscription, this.props.channel.data.target);
	}

	render() {
		const { head } = this.props.channel.data;
		if (!this.state.ready || !head || _.isEmpty(head.data) || !this.props.subscription) {
			return (
				<Box p={3}>
					<i className="fas fa-cog fa-spin" />
				</Box>
			);
		}
		const { tail, subscription } = this.props;
		const { tailType, lenses } = this.state;
		const useFilters = !!tailType && tailType.slug !== 'view';
		const activeLens = _.find(lenses, { slug: _.get(subscription, 'data.activeLens') }) || lenses[0];
		const channelIndex = _.findIndex(this.props.channels, { id: this.props.channel.id });
		const nextChannel = this.props.channels[channelIndex + 1];
		const groups = this.getGroups();
		const lensSupportsGroups = !!activeLens && !!activeLens.data.supportsGroups;

		return (
			<Flex
				className={`column--${head ? head.slug || head.type : 'unknown'}`}
				flexDirection="column"
				flex="1 1 auto"
				style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #ccc', position: 'relative' }}
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
											addFilterButtonProps={{
												style: { flex: '0 0 137px' },
											}}
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
								<If condition={groups.length > 0}>
									<Box ml={3} color={lensSupportsGroups ? undefined : '#ccc'}>
										Group by:
										<Select
											ml={2}
											disabled={!lensSupportsGroups}
											value={_.get(subscription, ['data', 'activeGroup'])}
											onChange={lensSupportsGroups ? this.setGroup : _.noop}
										>
											{_.map(groups, (group) => {
												return (
													<option
														key={group.slug}
														value={group.slug}
													>
														{group.name}
													</option>
												);
											})}
										</Select>
									</Box>
								</If>
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

						<Divider color="#ccc" mt={0} mb={0} style={{height: 1}} />
					</Box>
				</If>

				<Flex style={{height: '100%', minHeight: 0}}>
					<Flex
						flex="1"
						flexDirection="column"
						style={{
							height: '100%',
							borderRight: '1px solid #ccc',
							maxWidth: '100%',
							minWidth: 0,
						}}
					>
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

					{!!nextChannel &&
						<ChannelRenderer channel={nextChannel} />
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
		subscription: selectors.getSubscription(state, target),
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
