import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
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
import { Card, Lens, RendererProps, Type } from '../../Types';
import { sdk } from '../app';
import ButtonGroup from '../components/ButtonGroup';
import ChannelRenderer from '../components/ChannelRenderer';
import Icon from '../components/Icon';
import { If } from '../components/If';
import { NotificationsModal } from '../components/NotificationsModal';
import { TailStreamer } from '../components/TailStreamer';
import {
	connectComponent,
	ConnectedComponentProps,
} from '../services/connector';
import {
	createChannel,
	getTypeFromViewCard,
} from '../services/helpers';
import LensService from './index';

interface ViewRendererState {
	activeLens: null | Lens;
	filters: JSONSchema6[];
	lenses: Lens[];
	ready: boolean;
	showFilters: boolean;
	showNotificationSettings: boolean;
	subscription: null | Card;
	tail: null | Card[];
	tailType: Type | null;
}

interface ViewRendererProps extends ConnectedComponentProps, RendererProps {}

const USER_FILTER_NAME = 'user-generated-filter';

class ViewRenderer extends TailStreamer<ViewRendererProps, ViewRendererState> {
	constructor(props: ViewRendererProps) {
		super(props);

		this.state = {
			activeLens: null,
			filters: [],
			lenses: [],
			ready: false,
			showFilters: false,
			showNotificationSettings: false,
			subscription: null,
			tail: null,
			tailType: null,
		};

		this.bootstrap(this.props.channel.data.target);
	}

	getSubscription(target: string, userId: string) {
		const schema: JSONSchema6 = {
			type: 'object',
			properties: {
				type: {
					const: 'subscription',
				},
				data: {
					type: 'object',
					properties: {
						target: {
							const: target,
						},
						actor: {
							const: userId,
						},
					},
					additionalProperties: true,
				},
			},
			additionalProperties: true,
		};

		return sdk.query(schema)
			.toPromise()
			.then((results) => _.first(results) || null);
	}

	bootstrap(target: string) {
		// Set tail to null and ready state to false immediately
		this.setState({
			tail: null,
			ready: false,
		});

		const userId = this.props.appState.session!.user!.id;
		// load subscription
		this.getSubscription(target, userId)
		.then((card) => {
			if (card) {
				return card;
			}
			return sdk.card.create({
				type: 'subscription',
				data: {
					target,
					actor: userId,
				},
			})
			.toPromise()
			.then((id) => sdk.card.get(id).toPromise());
		})
		.then((subscription) => {
			const { head } = this.props.channel.data;
			const filters = head
				? _.map(_.filter(head.data.allOf, { name: USER_FILTER_NAME }), 'schema')
				: [];

			// set lens
			const lenses = _.chain(head)
				.get('data.lenses')
				.map((slug: string) => LensService.getLensBySlug(slug))
				.compact()
				.value();

			const activeLens = _.find(lenses, { slug: _.get(subscription, 'data.activeLens') });
			const tailType = _.find(this.props.appState.types, { slug: getTypeFromViewCard(head) }) || null;

			// Make a final check to see if the target is still correct
			if (this.props.channel.data.target !== target) {
				return;
			}
			// set default state
			this.setState({
				subscription,
				filters,
				lenses,
				activeLens: activeLens || lenses[0] || null,
				tailType,
				showFilters: false,
				showNotificationSettings: false,
				// mark as ready
				ready: true,
			});
		})
		.catch((error) => {
			this.props.actions.addNotification('danger', error.message);
		});

		this.streamTail(target);
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
			this.bootstrap(nextProps.channel.data.target);
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
		.toPromise()
		.then(
			(viewId) => this.props.actions.addChannel(createChannel({
				target: viewId,
				parentChannel: this.props.appState.channels[0].id,
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

		newView.data.actor = this.props.appState.session!.user!.id;

		view.filters.forEach((filter) => {
			newView.data.allOf.push({
				name: USER_FILTER_NAME,
				schema: _.assign(SchemaSieve.unflattenSchema(filter), { type: 'object' }),
			});
		});

		delete newView.id;

		return newView;
	}

	public updateFilters = (filters: JSONSchema6[]) => {
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

			this.streamTail(syntheticViewCard);
		}

		this.setState({ filters });
	}

	public getNotificationSettings() {
		return _.get(this.state.subscription, 'data.notificationSettings') || {};
	}

	public saveNotificationSettings = (settings: any) => {
		const { subscription } = this.state;

		if (!subscription) {
			return;
		}

		subscription.data.notificationSettings = settings;

		sdk.card.update(subscription.id, subscription);

		this.setState({
			subscription: _.cloneDeep(subscription),
			showNotificationSettings: false,
		});
	}

	public setLens = (e: React.MouseEvent<HTMLButtonElement>) => {
		const slug = e.currentTarget.dataset.slug;
		const lens = _.find(this.state.lenses, { slug });
		const { subscription } = this.state;

		if (!subscription || !lens) {
			return;
		}

		subscription.data.activeLens = lens.slug;

		sdk.card.update(subscription.id, subscription);

		this.setState({
			subscription: _.cloneDeep(subscription),
			activeLens: lens,
		});
	}

	public setGroup = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const { subscription } = this.state;

		if (!subscription) {
			return;
		}

		const slug = e.target.value;
		subscription.data.activeGroup = slug;

		sdk.card.update(subscription.id, subscription);
		this.setState({
			subscription: _.cloneDeep(subscription),
		});
	}

	public showNotificationSettings = () => {
		this.setState({ showNotificationSettings: true });
	}

	public hideNotificationSettings = () => {
		this.setState({ showNotificationSettings: false });
	}

	public toggleFilters = () => {
		this.setState({ showFilters: !this.state.showFilters });
	}

	render() {
		if (!this.state.ready) {
			return null;
		}
		const { head } = this.props.channel.data;
		const { tail, tailType } = this.state;
		const useFilters = !!tailType && tailType.slug !== 'view';
		const { activeLens } = this.state;
		const channelIndex = _.findIndex(this.props.appState.channels, { id: this.props.channel.id });
		const nextChannel = this.props.appState.channels[channelIndex + 1];
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
						<NotificationsModal
							show={this.state.showNotificationSettings}
							settings={this.getNotificationSettings()}
							onCancel={this.hideNotificationSettings}
							onDone={this.saveNotificationSettings}
						/>

						<Flex mt={3} justify="space-between">
							<Box pl={3}>
								<Button
									mr={2}
									tooltip={{ placement: 'bottom', text: 'Notification settings'}}
									onClick={this.showNotificationSettings}
									square={true}
								>
									<Icon name="bell" />
								</Button>

								<If condition={useFilters}>
									<Button
										tooltip={{ placement: 'bottom', text: 'Filter options'}}
										onClick={this.toggleFilters}
										square={true}
									>
										<Icon name="filter" />
									</Button>
								</If>
							</Box>

							<Flex px={3}>
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
									<Box ml={2} color={lensSupportsGroups ? undefined : '#ccc'}>
										<Select
											ml={2}
											disabled={!lensSupportsGroups}
											value={this.state.subscription!.data.activeGroup}
											onChange={lensSupportsGroups ? this.setGroup : _.noop}
										>
											{_.map(groups, (group) => {
												return (
													<option
														key={group.slug}
														value={group.slug}
													>
														Group by: {group.name}
													</option>
												);
											})}
										</Select>
									</Box>
								</If>
							</Flex>
						</Flex>

						<If condition={useFilters && this.state.showFilters}>
							<Box mx={3} mt={2} flex="1 0 auto">
								<Filters
									schema={(tailType as any).data.schema}
									filters={this.state.filters}
									onFiltersUpdate={this.updateFilters}
									onViewsUpdate={this.saveView}
									addFilterButtonProps={{
										style: { flex: '0 0 137px' },
									}}
									renderMode={['add', 'search', 'summary']}
								/>
							</Box>
						</If>

						<Divider color="#ccc" mt={3} mb={0} style={{height: 1}} />
					</Box>
				</If>

				<Flex style={{height: '100%'}}>
					<Flex flex="1" flexDirection="column" style={{height: '100%', borderRight: '1px solid #ccc'}}>
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
								subscription={this.state.subscription}
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

const lens: Lens = {
	slug: 'lens-view',
	type: 'lens',
	name: 'View lens',
	data: {
		type: 'view',
		icon: 'filter',
		renderer: connectComponent(ViewRenderer),
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
