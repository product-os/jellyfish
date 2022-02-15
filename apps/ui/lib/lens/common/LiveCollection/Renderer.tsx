import clone from 'deep-copy';
import { circularDeepEqual, deepEqual } from 'fast-equals';
import skhema from 'skhema';
import update from 'immutability-helper';
import _ from 'lodash';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Box, FiltersView, Flex, FlexProps, SchemaSieve } from 'rendition';
import { v4 as uuid } from 'uuid';
import { notifications, helpers, Icon } from '@balena/jellyfish-ui-components';
import type { JsonSchema } from '@balena/jellyfish-types';
import type {
	Contract,
	TypeContract,
	ViewContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';
import { actionCreators, analytics, sdk } from '../../../core';
import type {
	BoundActionCreators,
	ChannelContract,
	LensContract,
} from '../../../types';
import LiveCollection from './LiveCollection';
import Header from './Header';
import Content from './Content';
import { getLensBySlug } from '../..';

import {
	USER_FILTER_NAME,
	FULL_TEXT_SEARCH_TITLE,
	EVENTS_FULL_TEXT_SEARCH_TITLE,
} from './constants';
import { unpackLinksSchema } from './Header/Filters/filter-utils';

/**
 * Extracts an array of types that are defined in a schema
 *
 * @param {Object} schema
 *
 * @returns {String[]} - an array of types that are defined in the view card's filter
 */
const getTypesFromSchema = (schema) => {
	let value: string[] = [];
	const types =
		_.get(schema, ['properties', 'type', 'const']) ||
		_.get(schema, ['properties', 'type', 'enum']);
	if (types) {
		value = _.castArray(types);
	}
	if (schema.allOf) {
		for (const item of schema.allOf) {
			let found = getTypesFromSchema(item);
			if (found) {
				value = found;
				break;
			}
			if (item.schema.anyOf) {
				for (const subschema of item.schema.anyOf) {
					found = getTypesFromSchema(subschema);
					if (found) {
						break;
					}
				}
			}
			if (found) {
				value = found;
				break;
			}
		}
	}
	if (!value.length && schema.oneOf) {
		for (const item of schema.oneOf) {
			const found = getTypesFromSchema(item.schema);
			if (found) {
				value = found;
				break;
			}
		}
	}
	// Default to the `card` type, which will give a sensible schema
	return value.length > 0 ? _.uniq(value) : ['card'];
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

const unifyQuery = (query, filters) => {
	const result = clone(query);
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

		if (!result.allOf) {
			result.allOf = [];
		}

		result.allOf.push({
			type: 'object',
			..._.omit(filter, '$id'),
		});
	});

	return result;
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

const createEventSearchFilter = (
	types: TypeContract[],
	term: string,
	tailTypes: TypeContract[] | null,
) => {
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
	const schema: JsonSchema & { $id: string } = {
		type: 'object',
		$$links: {
			'has attached element': attachedElementSearchFilter,
		} as any,
		description: `Full text search in timeline for '${term}'`,
		title: EVENTS_FULL_TEXT_SEARCH_TITLE,
		$id: EVENTS_FULL_TEXT_SEARCH_TITLE,
	};

	// If possible, try to narrow down the query to only types that are expected
	if (tailTypes) {
		schema.properties = {
			type: {
				type: 'string',
			},
		};
		if (tailTypes.length > 1) {
			(schema.properties.type as any).enum = tailTypes.map((type) => {
				return `${type.slug}@${type.version}`;
			});
		} else {
			(schema.properties.type as any).const =
				tailTypes[0].slug + '@' + tailTypes[0].version;
		}
	}

	return schema;
};

export interface StateProps {
	types: TypeContract[];
	user: UserContract;
	userActiveLens: string | null;
	userActiveSlice: string | null;
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

export interface OwnProps {
	query: any;
	channel: ChannelContract;
	card: Contract;
	onResultsChange?: (collection: Contract[] | null) => any;
	seed?: any;
}

export interface ResponsiveProps {
	isMobile: boolean;
}

type Props = StateProps & DispatchProps & OwnProps & ResponsiveProps;

interface State {
	redirectTo: null | string;
	searchTerm?: string;
	eventSearchFilter?: any;
	searchFilter?: any;
	filters: any[];
	ready: boolean;
	tailTypes: null | TypeContract[];
	activeLens: string | null;
	activeSlice: any;
	sliceOptions?: any;
	query: JsonSchema | null;
	// TODO: Dry out these types, possibly using the SDK query option type instead
	options: {
		page: number;
		totalPages: number;
		limit: number;
		sortBy: string | string[];
		sortDir: 'asc' | 'desc';
	};
}

export default class ViewRenderer extends React.Component<Props, State> {
	constructor(props: Props) {
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
			query: null,
		};

		const methods = [
			'bootstrap',
			'getQueryOptions',
			'createView',
			'loadViewWithFilters',
			'saveView',
			'setLens',
			'setSlice',
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

	updateSearch(newSearchTerm: string) {
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
						this.state.tailTypes,
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
		const lens = getLensBySlug(slug);
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

		const lens = getLensBySlug(this.state.activeLens);

		const newFilters = setSliceFilter(
			this.state.filters,
			lens,
			value,
			this.state.sliceOptions,
		);

		this.updateFilters(newFilters);

		this.props.actions.setViewSlice(this.props.card.id, value);
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
		this.bootstrap();
	}

	bootstrap() {
		const { card, query, seed, user } = this.props;
		if (!user) {
			throw new Error(
				'Cannot bootstrap a live collection without an active user',
			);
		}
		if (!card) {
			return;
		}
		let filters = [];
		const activeLens =
			this.props.userActiveLens && getLensBySlug(this.props.userActiveLens);

		const viewTailTypes = getTypesFromSchema(query);

		const tailTypes = _.map(viewTailTypes, (tailType) => {
			return helpers.getType(tailType, this.props.types);
		});

		let activeSlice: any = null;

		const sliceOptions = getSliceOptions(card, this.props.types);

		if (sliceOptions && sliceOptions.length) {
			// Default to setting the active slice based on the user's preference
			if (this.props.userActiveSlice) {
				activeSlice = _.find(sliceOptions, this.props.userActiveSlice);
			}

			// Check if the view defines a slice filter
			activeSlice = activeSlice || getActiveSliceFromFilter(sliceOptions, card);

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
						this.state.tailTypes,
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
	getQueryOptions(
		lensSlug: string | null,
		keepState: boolean = true,
	): {
		limit: number;
		page: number;
		sortBy: string | string[];
		sortDir: 'asc' | 'desc';
		totalPages: number;
	} {
		const lens = getLensBySlug(lensSlug);

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
			options.sortBy = this.state.options.sortBy as string;
			options.sortDir = this.state.options.sortDir;
		}

		// The backend will throw an error if you make a request with a "limit"
		// higher than 1000, so normalize it here
		if (options.limit > 1000) {
			options.limit = 1000;
		}

		return options;
	}

	shouldComponentUpdate(nextProps, nextState) {
		return (
			!circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props)
		);
	}

	createView(view) {
		const { user, card } = this.props;
		const newView = clone<ViewContract>(card);
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
		const { actions, card, query } = this.props;
		const { searchFilter, eventSearchFilter } = this.state;

		const targetFilters = _.compact(filters);
		const searchFilters = _.compact([eventSearchFilter, searchFilter]);
		if (searchFilters.length === 1) {
			targetFilters.push(searchFilters[0]);
		} else if (searchFilters.length > 1) {
			targetFilters.push({ anyOf: searchFilters });
		}

		const viewQuery = unifyQuery(query, targetFilters);

		const syntheticViewCard = createSyntheticViewCard(card, targetFilters);

		const slice = getActiveSliceFromFilter(
			this.state.sliceOptions,
			syntheticViewCard,
		);

		actions.setViewSlice(card.id, slice);

		this.setState({
			query: viewQuery,
		});
	}

	render() {
		const { card, isMobile, types, channel } = this.props;

		const {
			tailTypes,
			activeLens,
			ready,
			redirectTo,
			filters,
			searchFilter,
			searchTerm,
		} = this.state;

		if (!ready || !card || _.isEmpty(card.data)) {
			return (
				<Box p={3}>
					<Icon spin name="cog" />
				</Box>
			);
		}

		if (redirectTo) {
			return <Redirect push to={redirectTo} />;
		}

		const lens = getLensBySlug(activeLens);
		const options = this.getQueryOptions(activeLens);

		return (
			<Flex
				className={`column--${
					card ? card.slug || card.type.split('@')[0] : 'unknown'
				}`}
				flexDirection="column"
				style={{
					height: '100%',
					overflowY: 'auto',
					position: 'relative',
				}}
			>
				{this.state.query && (
					<LiveCollection
						user={this.props.user}
						query={this.state.query}
						options={options}
						onResultsChange={this.props.onResultsChange}
					>
						<Header
							isMobile={isMobile}
							setLens={(
								event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
							) => {
								this.setLens(event.currentTarget.dataset.slug);
							}}
							lens={lens}
							filters={filters}
							tailTypes={tailTypes || []}
							allTypes={types}
							updateFilters={this.updateFilters}
							saveView={this.saveView}
							searchFilter={searchFilter}
							searchTerm={searchTerm || ''}
							updateSearch={(event) => {
								this.updateSearch(event.target.value);
							}}
							updateFiltersFromSummary={this.updateFiltersFromSummary}
							pageOptions={{ sortBy: options.sortBy, sortDir: options.sortDir }}
							onSortOptionsChange={this.handleSortOptionsChange}
						/>

						<Content
							lens={lens}
							channel={channel}
							tailTypes={tailTypes || []}
							pageOptions={options}
						/>
					</LiveCollection>
				)}
			</Flex>
		);
	}
}
