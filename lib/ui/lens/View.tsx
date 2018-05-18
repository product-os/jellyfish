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
	Txt,
} from 'rendition';
import { Card, Lens, RendererProps, Type } from '../../Types';
import { sdk } from '../app';
import ButtonGroup from '../components/ButtonGroup';
import ChannelRenderer from '../components/ChannelRenderer';
import Icon from '../components/Icon';
import { NotificationsModal } from '../components/NotificationsModal';
import { TailStreamer } from '../components/TailStreamer';
import {
	connectComponent,
	ConnectedComponentProps,
	createChannel,
	getTypeFromViewCard,
} from '../services/helpers';
import LensService from './index';

interface ViewRendererState {
	subscription: null | Card;
	filters: JSONSchema6[];
	tail: null | Card[];
	lenses: Lens[];
	activeLens: null | Lens;
	tailType: Type | null;
	showFilters: boolean;
	showNotificationSettings: boolean;
	ready: boolean;
}

interface ViewRendererProps extends ConnectedComponentProps, RendererProps {}

const USER_FILTER_NAME = 'user-generated-filter';

class ViewRenderer extends TailStreamer<ViewRendererProps, ViewRendererState> {
	constructor(props: ViewRendererProps) {
		super(props);

		this.state = {
			subscription: null,
			filters: [],
			tail: null,
			lenses: [],
			activeLens: null,
			tailType: null,
			showFilters: false,
			showNotificationSettings: false,
			ready: false,
		};

		this.bootstrap(this.props.channel.data.target);
	}

	public bootstrap(target: string) {
		// Set tail to null and ready state to false immediately
		this.setState({
			tail: null,
			ready: false,
		});

		const userId = this.props.appState.session!.user!.id;
		// load subscription
		sdk.subscription.getByTargetAndUser(target, userId)
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
			.then((id) => sdk.card.get(id));
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
		});

		this.streamTail(target);
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

	public saveView(view: FiltersView) {
		sdk.card.create(this.createView(view))
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
				schema: _.assign(filter, { type: 'object' }),
			});
		});

		return newView;
	}

	public updateFilters(filters: JSONSchema6[]) {
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
					schema: _.assign(filter, { type: 'object' }),
				});
			});

			this.streamTail(syntheticViewCard);
		}

		this.setState({ filters });
	}

	public getNotificationSettings() {
		return _.get(this.state.subscription, 'data.notificationSettings') || {};
	}

	public saveNotificationSettings(settings: any) {
		const { subscription } = this.state;

		if (!subscription) {
			return;
		}

		subscription.data.notificationSettings = settings;

		sdk.card.update(subscription.id, subscription);

		this.setState({
			subscription,
			showNotificationSettings: false,
		});
	}

	public setLens(lens: Lens) {
		const { subscription } = this.state;

		if (!subscription) {
			return;
		}

		subscription.data.activeLens = lens.slug;

		sdk.card.update(subscription.id, subscription);

		this.setState({
			subscription,
			activeLens: lens,
		});
	}

	public render() {
		if (!this.state.ready) {
			return null;
		}
		const { head } = this.props.channel.data;
		const { tail, tailType } = this.state;
		const useFilters = !!tailType && tailType.slug !== 'view';

		const { activeLens } = this.state;

		const originalFilters = head
			? _.map(_.reject(head.data.allOf, { name: USER_FILTER_NAME }), 'name')
			: [];

		const channelIndex = _.findIndex(this.props.appState.channels, { id: this.props.channel.id });
		const nextChannel = this.props.appState.channels[channelIndex + 1];

		return (
			<Flex
				className={`column--${head ? head.slug || head.type : 'unknown'}`}
				flexDirection='column'
				flex='1 1 auto'
				style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #ccc', position: 'relative' }}>
				{head &&
					<Box>
						<NotificationsModal
							show={this.state.showNotificationSettings}
							settings={this.getNotificationSettings()}
							onCancel={() => this.setState({ showNotificationSettings: false })}
							onDone={(settings) => this.saveNotificationSettings(settings)}
						/>

						{!!this.state.filters.length && !!originalFilters.length &&
							<Txt px={3} pt={2}>View extends <em>{originalFilters.join(', ')}</em></Txt>}
						<Flex mt={3} justify='space-between'>
							<Box pl={3}>
								<Button
									mr={2}
									tooltip={{ placement: 'bottom', text: 'Notification settings'}}
									onClick={() => this.setState({ showNotificationSettings: true })}
									square>
									<Icon name='bell' />
								</Button>

								{useFilters &&
									<Button
										tooltip={{ placement: 'bottom', text: 'Filter options'}}
										onClick={() => this.setState({ showFilters: !this.state.showFilters })}
										square>
										<Icon name='filter' />
									</Button>
								}
							</Box>

							{this.state.lenses.length > 1 && !!activeLens &&
								<ButtonGroup mr={3}>
									{_.map(this.state.lenses, lens =>
										<Button
											key={lens.slug}
											bg={activeLens.slug === lens.slug  ? '#333' : undefined}
											square
											onClick={() => this.setLens(lens)}>
											<Icon name={lens.data.icon} />
										</Button>,
									)}
								</ButtonGroup>
							}
						</Flex>

						{useFilters && this.state.showFilters &&
							<Box mx={3} mt={2} flex='1 0 auto'>
								<Filters
									schema={(tailType as any).data.schema}
									filters={this.state.filters}
									onFiltersUpdate={(filters) => this.updateFilters(filters)}
									onViewsUpdate={([view]) => this.saveView(view)}
									addFilterButtonProps={{
										style: { flex: '0 0 137px' },
									}}
									renderMode={['add', 'search', 'summary']}
								/>
							</Box>
						}

						<Divider color='#ccc' mt={3} mb={0} style={{height: 1}} />
					</Box>
				}

				<Flex style={{height: '100%'}}>
					<Flex flex='1' flexDirection='column' style={{height: '100%', borderRight: '1px solid #ccc'}}>
						{!tail &&
							<Box p={3}>
								<Icon name='cog fa-spin' />
							</Box>
						}

						{(!!tail && activeLens) && <activeLens.data.renderer
							channel={this.props.channel}
							tail={tail}
							type={tailType}
							/>}
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
