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
	Txt,
	Modal,
} from 'rendition';
import { Form } from 'rendition/dist/unstable';
import { Card, JellyfishState, Lens, RendererProps, Type } from '../../Types';
import ButtonGroup from '../components/ButtonGroup';
import Icon from '../components/Icon';
import TailStreamer from '../components/TailStreamer';
import { createChannel, getTypeFromViewCard } from '../services/helpers';
import * as sdk from '../services/sdk';
import { actionCreators } from '../services/store';
import LensService from './index';

interface ViewRendererState {
	filters: JSONSchema6[];
	tail: null | Card[];
	lenses: Lens[];
	activeLens: null | Lens;
	tailType: Type | null;
	showFilters: boolean;
	showNotificationSettings: boolean;
	notificationSettings: null | { [k: string]: any };
}

interface ViewRendererProps extends RendererProps {
	actions: typeof actionCreators;
	allChannels: JellyfishState['channels'];
	session: JellyfishState['session'];
}

const USER_FILTER_NAME = 'user-generated-filter';

class ViewRenderer extends TailStreamer<ViewRendererProps, ViewRendererState> {
	private notificationSettingsSchema: JSONSchema6 = {
		type: 'object',
		properties: {
			web: {
				title: 'Web',
				description: 'Alert me with desktop notifications',
				type: 'object',
				properties: {
					update: {
						title: 'On update',
						description: 'When new content is added',
						type: 'boolean',
					},
					mention: {
						title: 'On mention',
						description: 'When I am mentioned',
						type: 'boolean',
					},
					alert: {
						title: 'On alert',
						description: 'When I am alerted',
						type: 'boolean',
					},
				},
				additionalProperties: false,
			},
		},
	};

	constructor(props: ViewRendererProps) {
		super(props);

		const filters = this.props.channel.data.head
			? _.map(_.filter(this.props.channel.data.head.data.allOf, { name: USER_FILTER_NAME }), 'schema')
			: [];

		this.state = {
			filters,
			tail: null,
			lenses: [],
			activeLens: null,
			tailType: null,
			showFilters: false,
			showNotificationSettings: false,
			notificationSettings: null,
		};

		this.streamTail(this.props.channel.data.target);
	}

	public componentWillReceiveProps(nextProps: ViewRendererProps) {
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

	public setTail(tail: Card[]) {
		const { head } = this.props.channel.data;

		let tailType: Type | null = null;

		// Special case handling for base view `view-active`
		if (head && head.slug === 'view-active') {
			tailType = sdk.type.get('card') || null;
		} else if (tail.length) {
			tailType = sdk.type.get(tail[0].type) || null;
		} else {
			// If there is no tail, make a best guess at the type
			const foundType = getTypeFromViewCard(head);

			tailType = sdk.type.get(foundType) || null;
		}

		const preferences = (head && head.data.lenses) || (tailType ? tailType.data.lenses : undefined);

		const lenses: Lens[] = tail.length > 0 ?
			LensService.getLenses(tail, preferences)
			: LensService.getLensesByType(tailType ? tailType.slug : null, preferences);

		const activeLens = this.state.activeLens || lenses[0] || null;

		this.setState({
			tail,
			lenses,
			activeLens,
			tailType,
		});
	}

	public openChannel(card: Card) {
		this.props.actions.addChannel(createChannel({
			target: card.id,
			head: card,
			parentChannel: this.props.channel.id,
		}));
	}

	public saveView(view: FiltersView) {
		sdk.card.add(this.createView(view))
		.then(
			(response) => this.props.actions.addChannel(createChannel({
				target: response.results.data,
				parentChannel: this.props.allChannels[0].id,
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

		newView.data.actor = this.props.session!.user!.id;

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

	public getSubscription() {
		return sdk.db.query({
			type: 'object',
			properties: {
				type: {
					const: 'subscription',
				},
				data: {
					type: 'object',
					properties: {
						target: {
							const: this.props.channel.data.target,
						},
						actor: {
							const: this.props.session!.user!.id,
						},
					},
					additionalProperties: true,
				},
			},
			additionalProperties: true,
		})
		.then((results) => _.first(results) || null);
	}

	public loadNotificationSettings() {
		this.setState({ showNotificationSettings: true });

		this.getSubscription()
		.then((card) => {
			if (!card) {
				this.setState({ notificationSettings: {} });
				return;
			}

			this.setState({ notificationSettings: _.get(card, 'data.notificationSettings') || {} });
		});
	}

	public saveNotificationSettings() {
		const notificationSettings = _.cloneDeep(this.state.notificationSettings);

		this.getSubscription()
		.then((card) => {
			if (!card) {
				sdk.card.add({
					type: 'subscription',
					data: {
						target: this.props.channel.data.target,
						actor: this.props.session!.user!.id,
						notificationSettings,
					},
				});

				return;
			}
			sdk.card.update(card.id, {
				...card,
				data: {
					...card.data,
					notificationSettings,
				},
			});
		});

		this.setState({
			showNotificationSettings: false,
			notificationSettings: null,
		});

	}

	public render() {
		const { head } = this.props.channel.data;
		const { tail, tailType } = this.state;
		const useFilters = !!tailType && tailType.slug !== 'view';

		const { activeLens } = this.state;

		const originalFilters = head
			? _.map(_.reject(head.data.allOf, { name: USER_FILTER_NAME }), 'name')
			: [];

		return (
			<Flex
				className={`column--${head ? head.slug || head.type : 'unknown'}`}
				flexDirection='column'
				flex='1 0 auto'
				style={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #ccc', minWidth: 450, maxWidth: 700, position: 'relative' }}>
				{head &&
					<Box>
						{this.state.showNotificationSettings &&
							<Modal
								title='Notification settings'
								cancel={() => this.setState({ showNotificationSettings: false })}
								done={() => this.saveNotificationSettings()}
							>
								{!this.state.notificationSettings && <span>Loading settings... <i className='fas fa-cog fa-spin' /></span>}
								{!!this.state.notificationSettings &&
									<Form
										schema={this.notificationSettingsSchema}
										value={this.state.notificationSettings}
										onFormChange={(data: any) => this.setState({ notificationSettings: data.formData })}
										onFormSubmit={() => this.saveNotificationSettings()}
										hideSubmitButton
									/>
								}
							</Modal>
						}

						{!!this.state.filters.length && !!originalFilters.length &&
							<Txt px={3} pt={2}>View extends <em>{originalFilters.join(', ')}</em></Txt>}
						<Flex mt={3} justify='space-between'>
							<Box pl={3}>
								<Button
									mr={2}
									tooltip={{ placement: 'bottom', text: 'Notification settings'}}
									onClick={() => this.loadNotificationSettings()}
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

							{this.state.lenses.length > 1 &&
								<ButtonGroup mr={3}>
									{_.map(this.state.lenses, lens =>
										<Button
											key={lens.slug}
											bg={this.state.activeLens!.slug === lens.slug  ? '#333' : undefined}
											square
											onClick={() => this.setState({ activeLens: lens })}>
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

						<Divider color='#ccc' mb={0} />
					</Box>
				}

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
		);
	}
}

const mapStateToProps = (state: JellyfishState) => ({
	allChannels: state.channels,
	session: state.session,
});

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
		renderer: connect(mapStateToProps, mapDispatchToProps)(ViewRenderer),
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
