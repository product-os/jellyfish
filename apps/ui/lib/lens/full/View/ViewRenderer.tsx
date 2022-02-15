import clone from 'deep-copy';
import { circularDeepEqual, deepEqual } from 'fast-equals';
import skhema from 'skhema';
import update from 'immutability-helper';
import _ from 'lodash';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Box, FiltersView, Flex, FlexProps, SchemaSieve } from 'rendition';
import { v4 as uuid } from 'uuid';
import {
	notifications,
	helpers,
	Icon,
} from '@balena/jellyfish-ui-components';
import jsf from 'json-schema-faker';
import type { JsonSchema } from '@balena/jellyfish-types';
import type { ViewContract } from '@balena/jellyfish-types/build/core';
import { actionCreators, analytics, selectors, sdk } from '../../../core';
import type {
	BoundActionCreators,
	ChannelContract,
	LensContract,
} from '../../../types';
import { getLenses } from '../../';
import Header from './Header';
import Content from './Content';

import {
	USER_FILTER_NAME,
	FULL_TEXT_SEARCH_TITLE,
	EVENTS_FULL_TEXT_SEARCH_TITLE,
} from './constants';
import { unpackLinksSchema } from './Header/ViewFilters/filter-utils';
import {
	Contract,
	TypeContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';

const getActiveLens = (lenses, lensSlug) => {
	return (
		_.find(lenses, {
			slug: lensSlug,
		}) || _.first(lenses)
	);
};

const setSliceFilter = (currentFilters, lens, slice, sliceOptions) => {
	// All slice options have the same path so we just use the first of the options
	const sliceFilterId = _.get(sliceOptions, [0, 'value', 'path']);

	// Remove any existing slice filter
	const filters = sliceFilterId
		? currentFilters.filter((filter) => {
				return filter.$id !== sliceFilterId;
		  })
		: currentFilters;

	// We only want to filter by slice if the lens does not supports slices itself!
	if (
		!_.get(lens, ['data', 'supportsSlices']) &&
		_.get(sliceOptions, 'length')
	) {
		const sliceFilter = createSliceFilter(slice, true);
		filters.push({
			$id: sliceFilter.$id,
			anyOf: [sliceFilter],
		});
	}

	return filters;
};

export const getSearchViewId = (targetId) => `$$search-${targetId}`;

// Search the view card's filters for a slice filter. If one is found
// that matches one of the slice options, return that slice option
const getActiveSliceFromFilter = (sliceOptions, viewCard) => {
	const viewFilters = _.get(viewCard, ['data', 'allOf'], []);
	for (const slice of sliceOptions) {
		const sliceFilter = createSliceFilter(slice);
		for (const viewFilter of viewFilters) {
			const filterOptions = _.map(
				_.get(viewFilter, ['schema', 'anyOf']),
				'properties',
			);
			const activeSliceFilter = _.find(filterOptions, sliceFilter.properties);
			if (activeSliceFilter) {
				return slice;
			}
		}
	}
	return null;
};

const createSliceFilter = (slice, required = false) => {
	const filter = {
		// Use the slice path as a unique ID, as we don't want multiple slice constraints
		// on the same path
		$id: slice.value.path,
		title: 'is',
		description: `${slice.title}`,
		type: 'object',
		properties: {},
	};

	if (!slice.value.value) {
		return filter;
	}

	_.set(filter, slice.value.path, {
		const: slice.value.value,
	});

	const keys = slice.value.path.split('.');
	const origKeys = _.clone(keys);

	// Make sure that "property" keys correspond with { type: 'object' },
	// and specify the required field as well
	// otherwise the filter won't work
	while (keys.length) {
		if (keys.pop() === 'properties') {
			const fieldName = _.get(origKeys, keys.length + 1);
			_.set(filter, keys.concat('type'), 'object');
			if (required && fieldName) {
				_.set(filter, keys.concat('required'), [fieldName]);
			}
		}
	}
	return filter;
};

// TODO helpers.getViewSlices() should just return a set of schemas allowing us
// to remove all the intermediary data formats
const getSliceOptions = (card, types) => {
	const slices = helpers.getViewSlices(card, types);
	if (!slices) {
		return [];
	}
	const sliceOptions: any = [];
	for (const slice of slices) {
		_.forEach(slice.values, (sliceValue: string, index: number) => {
			// If the slice defines user-friendly names (from the JSON schema's enumNames property) use that;
			// otherwise just use the sliceValue (from the JSON schema's enum property)
			const sliceOptionTitle = _.get(slice, ['names', index], sliceValue);
			sliceOptions.push({
				title: `${slice.title} is ${sliceOptionTitle}`,
				value: {
					path: slice.path,
					value: sliceValue,
				},
			});
		});
	}

	return sliceOptions.length ? sliceOptions : null;
};

export const createSyntheticViewCard = (view, filters) => {
	const syntheticViewCard = clone(view);
	const originalFilters = view
		? _.reject(view.data.allOf, {
				name: USER_FILTER_NAME,
		  })
		: [];
	syntheticViewCard.data.allOf = originalFilters;

	filters.forEach((filter) => {
		if (
			// Full text search filters do not need unpacking
			filter.$id !== FULL_TEXT_SEARCH_TITLE &&
			filter.$id !== EVENTS_FULL_TEXT_SEARCH_TITLE &&
			filter.anyOf
		) {
			filter.anyOf = filter.anyOf.map((subSchema: JsonSchema) => {
				// Only $$links filters need unflattening and re-structuring slightly
				if (
					typeof subSchema !== 'boolean' &&
					subSchema.properties &&
					subSchema.properties.$$links
				) {
					return {
						$$links: unpackLinksSchema(
							subSchema.properties!.$$links as JsonSchema,
						),
					};
				}
				return subSchema;
			});
		}

		syntheticViewCard.data.allOf.push({
			name: USER_FILTER_NAME,
			schema: {
				type: 'object',
				..._.omit(filter, '$id'),
			},
		});
	});

	return syntheticViewCard;
};

const createSearchFilter = (types, term) => {
	if (!term) {
		return null;
	}
	const searchFilterAnyOf = _.compact(
		types.map((type) => {
			const filterForType: any = helpers.createFullTextSearchFilter(
				type.data.schema,
				term,
				{
					fullTextSearchFieldsOnly: true,
				},
			);
			return (
				filterForType &&
				skhema.merge([
					{
						description:
							types.length > 1
								? `{"name":"Any ${type.slug} field","value":"${term}","operator":"contains"}`
								: `{"name":"Any field","value":"${term}","operator":"contains"}`,
					},
					filterForType,
					{
						required: ['type'],
						properties: {
							type: {
								type: 'string',
								const: `${type.slug}@${type.version}`,
							},
						},
					},
				])
			);
		}),
	);
	return searchFilterAnyOf.length
		? {
				anyOf: searchFilterAnyOf,
				description: `Full text search for '${term}'`,
				title: FULL_TEXT_SEARCH_TITLE,
				$id: FULL_TEXT_SEARCH_TITLE,
		  }
		: null;
};

const createEventSearchFilter = (types, term) => {
	if (!term) {
		return null;
	}
	const eventTypes = ['message', 'whisper'].map((eventSlug) => {
		return helpers.getType(eventSlug, types);
	});
	const attachedElementSearchFilter = {
		type: 'object',
		additionalProperties: true,
		description: `Any attached element field contains ${term}`,
		anyOf: _.compact(
			_.flatMap(eventTypes, (eventType) => {
				const anyOfOption: any = helpers.createFullTextSearchFilter(
					eventType.data.schema,
					term,
					{
						fullTextSearchFieldsOnly: true,
					},
				);
				anyOfOption.anyOf = _.map(anyOfOption.anyOf, (subSchema) => {
					return skhema.merge([
						{
							type: 'object',
							description: anyOfOption.description,
							required: ['type'],
							properties: {
								type: {
									const: `${eventType.slug}@${eventType.version}`,
								},
							},
						},
						subSchema,
					]);
				});
				return anyOfOption.anyOf;
			}),
		),
	};
	if (!attachedElementSearchFilter.anyOf.length) {
		return null;
	}
	return {
		type: 'object',
		$$links: {
			'has attached element': attachedElementSearchFilter,
		},
		description: `Full text search in timeline for '${term}'`,
		title: EVENTS_FULL_TEXT_SEARCH_TITLE,
		$id: EVENTS_FULL_TEXT_SEARCH_TITLE,
	};
};

interface ViewRendererProps {
	types: TypeContract[];
	lenses: LensContract[];
	channel: ChannelContract;
	card: Contract;
	user: UserContract;
	userActiveLens: string | null;
	userActiveSlice: string | null;
	isMobile: boolean;
	tail: null | Contract[];
	flex: FlexProps['flex'];
	actions: BoundActionCreators<
		Pick<
			typeof actionCreators,
			| 'clearViewData'
			| 'setViewLens'
			| 'setViewSlice'
			| 'loadMoreViewData'
			| 'loadViewData'
			| 'setViewData'
		>
	>;
}

interface State {
	redirectTo: null | string;
	searchTerm?: string;
	eventSearchFilter?: any;
	searchFilter?: any;
	filters: any[];
	ready: boolean;
	tailTypes: null | TypeContract[];
	activeLens: any;
	activeSlice: any;
	sliceOptions?: any;
	options: {
		page: number;
		totalPages: number;
		limit: number;
		sortBy: string[];
		sortDir: 'asc' | 'desc';
	};
}

export default class ViewRenderer extends React.Component<ViewRendererProps, State> {
	constructor(props: ViewRendererProps) {
		super(props);

		this.state = {
			redirectTo: null,
			searchTerm: '',
			eventSearchFilter: null,
			searchFilter: null,
			filters: [],
			ready: false,
			tailTypes: null,
			activeLens: null,
			activeSlice: null,
			options: {
				page: 0,
				totalPages: Infinity,
				limit: 100,
				sortBy: ['created_at'],
				sortDir: 'desc',
			},
		};

		const methods = [
			'bootstrap',
			'getQueryOptions',
			'createView',
			'loadViewWithFilters',
			'saveView',
			'setLens',
			'setPage',
			'setSlice',
			'updateView',
			'updateSearch',
			'updateFiltersFromSummary',
			'updateFilters',
			'getQueryOptions',
			'handleSortOptionsChange',
		];
		methods.forEach((method) => {
			this[method] = this[method].bind(this);
		});

		this.loadViewWithFilters = _.debounce(this.loadViewWithFilters, 350);
	}

	saveView([view]: FiltersView[]) {
		if (!view) {
			return;
		}

		const newView = this.createView(view);

		sdk.card
			.create(newView)
			.then((card: any) => {
				analytics.track('element.create', {
					element: {
						type: 'view',
					},
				});
				this.setState({
					redirectTo: `/${card.slug || card.id}`,
				});
			})
			.catch((error) => {
				notifications.addNotification('danger', error.message);
			});
	}

	updateFiltersFromSummary(filters) {
		// Separate out the search filter from the other filters
		const [searchFilters, filtersWithoutSearch] = _.partition(filters, {
			title: FULL_TEXT_SEARCH_TITLE,
		});
		if (searchFilters.length) {
			this.updateFilters(filtersWithoutSearch);
		} else {
			// If the search filter has been removed by the Filters summary,
			// update our component state accordingly before updating filters
			this.setState(
				{
					eventSearchFilter: null,
					searchFilter: null,
					searchTerm: '',
				},
				() => {
					this.updateFilters(filtersWithoutSearch);
				},
			);
		}
	}

	updateFilters(filters) {
		this.setState(
			(prevState) => {
				return {
					options: update(prevState.options, {
						page: {
							$set: 0,
						},
					}),
					filters,
				};
			},
			() => {
				this.loadViewWithFilters(filters);
			},
		);
	}

	updateSearch(newSearchTerm) {
		this.setState(
			(prevState) => {
				return {
					options: update(prevState.options, {
						page: {
							$set: 0,
						},
						totalPages: {
							$set: Infinity,
						},
					}),
					eventSearchFilter: createEventSearchFilter(
						this.props.types,
						newSearchTerm,
					),
					searchFilter: createSearchFilter(this.state.tailTypes, newSearchTerm),
					searchTerm: newSearchTerm,
				};
			},
			() => {
				this.loadViewWithFilters(this.state.filters);
			},
		);
	}

	setLens(slug) {
		const lens = _.find(this.props.lenses, {
			slug,
		});
		if (!lens) {
			return;
		}

		if (this.state.activeLens === lens.slug) {
			return;
		}

		// Some lenses ignore the slice filter, so recalculate the filters using
		// the new lens.
		const filters = setSliceFilter(
			this.state.filters,
			lens,
			this.state.activeSlice,
			this.state.sliceOptions,
		);

		const newOptions = this.getQueryOptions(slug, false);

		const reloadRequired =
			!deepEqual(this.state.filters, filters) ||
			!deepEqual(this.state.options, newOptions);

		if (reloadRequired && this.props.channel.data.head) {
			this.props.actions.clearViewData(this.props.channel.data.head.id);
			this.props.actions.clearViewData(
				getSearchViewId(this.props.channel.data.head.id),
			);
		}

		this.setState(
			() => {
				return {
					options: newOptions,
					filters,
					activeLens: lens.slug,
				};
			},
			() => {
				if (reloadRequired) {
					this.loadViewWithFilters(this.state.filters);
				}
			},
		);

		this.props.actions.setViewLens(this.props.card.id, lens.slug);
	}

	setSlice({ value }) {
		this.setState({
			activeSlice: value,
		});

		const lens = _.find(this.props.lenses, {
			slug: this.state.activeLens,
		});

		const newFilters = setSliceFilter(
			this.state.filters,
			lens,
			value,
			this.state.sliceOptions,
		);

		this.updateFilters(newFilters);

		this.props.actions.setViewSlice(this.props.card.id, value);
	}

	async setPage(page): Promise<void> {
		if (page + 1 >= this.state.options.totalPages) {
			return;
		}
		return new Promise((resolve, reject) => {
			this.setState(
				({ options }) => ({
					options: {
						...options,
						page,
					},
				}),
				() => {
					this.updateView().then(resolve).catch(reject);
				},
			);
		});
	}

	updateView() {
		const { channel } = this.props;
		const { filters, options, activeLens } = this.state;
		const syntheticViewCard = createSyntheticViewCard(
			channel.data.head,
			filters,
		);
		const queryOptions = this.getQueryOptions(activeLens);
		return this.props.actions
			.loadMoreViewData(syntheticViewCard, queryOptions)
			.then((data) => {
				if (data.length < queryOptions.limit) {
					this.setState({
						options: {
							...options,
							totalPages: options.page + 1,
						},
					});
				}
			});
	}

	handleSortOptionsChange(sortOptions) {
		this.setState(
			({ options }) => ({
				options: {
					...options,
					page: 0,
					totalPages: Infinity,
					...sortOptions,
				},
			}),
			() => {
				this.loadViewWithFilters(this.state.filters);
			},
		);
	}

	componentDidMount() {
		this.bootstrap(this.props.channel);
	}

	componentWillUnmount() {
		const { head } = this.props.channel.data;

		if (head) {
			this.props.actions.clearViewData(head.id);
		}
	}

	bootstrap(channel) {
		const { head, seed } = channel.data;
		if (!this.props.user) {
			throw new Error('Cannot bootstrap a view without an active user');
		}
		if (!head) {
			return;
		}
		this.props.actions.clearViewData(head.id);
		let filters = head
			? _.map(
					_.filter(head.data.allOf, {
						name: USER_FILTER_NAME,
					}),
					'schema',
			  )
			: [];

		const activeLens = getActiveLens(
			this.props.lenses,
			this.props.userActiveLens,
		);

		const viewTailTypes = helpers.getTypesFromViewCard(head);

		const tailTypes = _.map(viewTailTypes, (tailType) => {
			return helpers.getType(tailType, this.props.types);
		});

		let activeSlice: any = null;

		const sliceOptions = getSliceOptions(head, this.props.types);

		if (sliceOptions && sliceOptions.length) {
			// Default to setting the active slice based on the user's preference
			if (this.props.userActiveSlice) {
				activeSlice = _.find(sliceOptions, this.props.userActiveSlice);
			}

			// Check if the view defines a slice filter
			activeSlice = activeSlice || getActiveSliceFromFilter(sliceOptions, head);

			// Otherwise just select the first slice option
			activeSlice = activeSlice || _.first(sliceOptions);

			filters = setSliceFilter(filters, activeLens, activeSlice, sliceOptions);
		}

		const initialSearchTerm = _.get(seed, ['searchTerm']);
		const searchTermState = initialSearchTerm
			? {
					eventSearchFilter: createEventSearchFilter(
						this.props.types,
						initialSearchTerm,
					),
					searchFilter: createSearchFilter(tailTypes, initialSearchTerm),
					searchTerm: initialSearchTerm,
			  }
			: {};

		// Set default state
		this.setState(
			{
				activeLens: _.get(activeLens, 'slug', null),
				filters,
				tailTypes,
				activeSlice,
				sliceOptions,
				...searchTermState,

				// Mark as ready
				ready: true,
			},
			() => {
				this.loadViewWithFilters(filters);
			},
		);
	}

	// TODO: Make all lenses handle pagination and remove this exception.
	// For this to work properly there needs to be a mechanism for returning the
	// total available items from the API.
	getQueryOptions(lensSlug, keepState = true) {
		const lens = getActiveLens(this.props.lenses, lensSlug);

		// TODO: improve backend sort efficiency so we can apply a default sort here
		const options = _.merge(
			{
				limit: 30,
				page: 0,
			},
			this.state.options,
			_.get(lens, ['data', 'queryOptions']),
		);

		if (keepState) {
			options.page = this.state.options.page;
			options.sortBy = this.state.options.sortBy;
			options.sortDir = this.state.options.sortDir;
		}

		// The backend will throw an error if you make a request with a "limit"
		// higher than 1000, so normalize it here
		if (options.limit > 1000) {
			options.limit = 1000;
		}

		return options;
	}

	static getDerivedStateFromProps(nextProps, prevState) {
		if (nextProps.tail && nextProps.tail.length < 30) {
			return {
				options: Object.assign({}, prevState.options, {
					totalPages: 1,
				}),
			};
		}

		return null;
	}

	componentDidUpdate(prevProps) {
		if (this.props.channel.data.target !== prevProps.channel.data.target) {
			this.setState({
				ready: false,
			});
		}
		if (
			!circularDeepEqual(
				this.props.channel.data.target,
				prevProps.channel.data.target,
			)
		) {
			this.bootstrap(this.props.channel);
		}

		if (
			!_.get(prevProps, ['lenses', 'length']) &&
			_.get(this.props, ['lenses', 'length'])
		) {
			const activeLens = getActiveLens(
				this.props.lenses,
				this.props.userActiveLens,
			).slug;
			this.setLens(activeLens);
		}
		if (
			_.get(prevProps.channel.data, ['seed', 'searchTerm']) !==
			_.get(this.props.channel.data, ['seed', 'searchTerm'])
		) {
			this.updateSearch(
				_.get(
					this.props.channel.data,
					['seed', 'searchTerm'],
					this.state.searchTerm,
				),
			);
		}
	}

	createView(view) {
		const { user, channel } = this.props;
		const newView = clone<ViewContract>(channel.data.head!);
		newView.name = view.name;
		newView.slug = `view-user-created-view-${uuid()}-${helpers.slugify(
			view.name,
		)}`;
		if (!newView.data.allOf) {
			newView.data.allOf = [];
		}
		newView.data.allOf = _.reject(newView.data.allOf, {
			name: USER_FILTER_NAME,
		});
		newView.data.actor = user.id;
		view.filters.forEach((filter) => {
			newView.data.allOf!.push({
				name: USER_FILTER_NAME,
				schema: _.assign(SchemaSieve.unflattenSchema(filter), {
					type: 'object',
				}),
			});
		});
		Reflect.deleteProperty(newView, 'id');
		Reflect.deleteProperty(newView, 'created_at');
		Reflect.deleteProperty(newView.data, 'namespace');
		return newView;
	}

	loadViewWithFilters(filters) {
		const { actions, channel } = this.props;
		const { searchFilter, activeLens, eventSearchFilter } = this.state;
		const targetFilters = _.compact([...filters, searchFilter]);
		const eventFilters = _.compact([...filters, eventSearchFilter]);

		const syntheticViewCard = createSyntheticViewCard(
			channel.data.head,
			targetFilters,
		);
		const eventSyntheticViewCard = createSyntheticViewCard(
			channel.data.head,
			eventFilters,
		);

		// Use a different id for the event search view as this is the key used by the redux cache
		eventSyntheticViewCard.id = getSearchViewId(eventSyntheticViewCard.id);

		const options = this.getQueryOptions(activeLens);

		const slice = getActiveSliceFromFilter(
			this.state.sliceOptions,
			syntheticViewCard,
		);

		actions.setViewSlice(channel.data.head!.id, slice);

		actions.clearViewData(syntheticViewCard);
		actions.clearViewData(eventSyntheticViewCard);

		actions.loadViewData(syntheticViewCard, options);
		if (eventSearchFilter) {
			actions.loadViewData(eventSyntheticViewCard, options);
		} else {
			actions.setViewData(eventSyntheticViewCard, []);
		}
	}

	render() {
		const { lenses, channel, isMobile, tail, types } = this.props;

		const { head } = channel.data;

		const {
			tailTypes,
			activeLens,
			ready,
			redirectTo,
			filters,
			sliceOptions,
			activeSlice,
			options,
			searchFilter,
			searchTerm,
		} = this.state;

		if (!ready || !head || _.isEmpty(head.data)) {
			return (
				<Box p={3}>
					<Icon spin name="cog" />
				</Box>
			);
		}

		if (redirectTo) {
			return <Redirect push to={redirectTo} />;
		}

		const lens = getActiveLens(lenses, activeLens);

		return (
			<Flex
				flex={this.props.flex}
				className={`column--${
					head ? head.slug || head.type.split('@')[0] : 'unknown'
				}`}
				flexDirection="column"
				style={{
					height: '100%',
					overflowY: 'auto',
					position: 'relative',
				}}
			>
				<Header
					isMobile={isMobile}
					lenses={lenses}
					setLens={(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
						this.setLens(event.currentTarget.dataset.slug);
					}}
					lens={lens}
					filters={filters}
					tailTypes={tailTypes || []}
					allTypes={types}
					updateFilters={this.updateFilters}
					saveView={this.saveView}
					channel={channel}
					searchFilter={searchFilter}
					searchTerm={searchTerm || ''}
					updateSearch={(event) => {
						this.updateSearch(event.target.value);
					}}
					updateFiltersFromSummary={this.updateFiltersFromSummary}
					pageOptions={{ sortBy: options.sortBy, sortDir: options.sortDir }}
					onSortOptionsChange={this.handleSortOptionsChange}
					tail={tail}
				/>
				<Flex height="100%" minHeight="0" mt={filters.length ? 0 : 3}>
					<Content
						lens={lens}
						activeLens={activeLens}
						tail={tail}
						channel={channel}
						getQueryOptions={this.getQueryOptions}
						tailTypes={tailTypes || []}
						setPage={this.setPage}
						pageOptions={options}
					/>
				</Flex>
			</Flex>
		);
	}
}

const mapStateToProps = (state, ownProps) => {
	const target = ownProps.channel.data.head.id;
	const targetTail = selectors.getViewData(state, target);
	const timelineSearchTail = selectors.getViewData(
		state,
		getSearchViewId(target),
	);
	const tail =
		targetTail && timelineSearchTail
			? _.unionBy(targetTail, timelineSearchTail, 'id')
			: null;
	const user = selectors.getCurrentUser(state);

	let lenses: any[] = [];

	// Select a set of lenses based on the tail data
	if (tail && tail.length) {
		lenses = getLenses('list', tail, user, 'data.icon');
	} else {
		// If there isn't a tail loaded, mock the expected output based on the query
		// schema and use the mock to select appropriate lenses
		const svc = createSyntheticViewCard(ownProps.channel.data.head, []);
		const mock = jsf.generate({
			type: 'object',
			allOf: _.map(_.get(svc, ['data', 'allOf'], []), 'schema'),
		});
		lenses = getLenses('list', [mock], user, 'data.icon');
	}

	return {
		channels: selectors.getChannels(state),
		tail,
		lenses,
		types: selectors.getTypes(state),
		user,
		userActiveLens: selectors.getUsersViewLens(state, target),
		userActiveSlice: selectors.getUsersViewSlice(state, target),
	};
};
