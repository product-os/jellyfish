import clone from 'deep-copy';
import { circularDeepEqual, deepEqual } from 'fast-equals';
import skhema from 'skhema';
import update from 'immutability-helper';
import _ from 'lodash';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Box, FiltersView, Flex, SchemaSieve } from 'rendition';
import { v4 as uuid } from 'uuid';
import * as notifications from '../../../services/notifications';
import * as helpers from '../../../services/helpers';
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
				value = value.concat(found);
				break;
			}
			if (item.anyOf) {
				for (const subschema of item.anyOf) {
					found = getTypesFromSchema(subschema);
					if (found) {
						value = value.concat(found);
					}
				}
			}
		}
	}
	if (!value.length && schema.oneOf) {
		for (const item of schema.oneOf) {
			const found = getTypesFromSchema(item.schema);
			if (found) {
				value = value.concat(found);
			}
		}
	}
	// Default to the `card` type, which will give a sensible schema
	return value.length > 0 ? _.uniq(value) : null;
};

const setSliceFilter = (filters, lens, slice) => {
	// We only want to filter by slice if the lens does not supports slices itself!
	if (!_.get(lens, ['data', 'supportsSlices'])) {
		filters.push({
			$id: slice.$id,
			anyOf: [slice],
		});
	}

	return filters;
};

export const getSearchViewId = (targetId) => `$$search-${targetId}`;

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
	userCustomFilters: JsonSchema[];
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

export interface OwnProps {
	query: any;
	channel: ChannelContract;
	card: Contract;
	onResultsChange?: (collection: Contract[] | null) => any;
	onQueryUpdate?: (query: JsonSchema) => any;
	seed?: any;
	hideFooter?: boolean;
	useSlices?: boolean;
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
	tailTypes: null | TypeContract[];
	activeLens: string | null;
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

		const { query, seed, useSlices } = this.props;

		const activeLens =
			this.props.userActiveLens &&
			this.getLensBySlug(this.props.userActiveLens);

		const viewTailTypes = getTypesFromSchema(query);

		const tailTypes = _.map(viewTailTypes, (tailType) => {
			return helpers.getType(tailType, this.props.types);
		});

		const initialSearchTerm = _.get(seed, ['searchTerm']);

		let filters: JsonSchema[] = [];
		const sliceOptions = helpers.getSchemaSlices(query, this.props.types);

		// If an initial search term is provided don't use slices and skip existing filters
		if (!initialSearchTerm) {
			// If the user has already set filters, re-use these, otherwise load the default slice
			if (this.props.userCustomFilters.length) {
				filters = this.props.userCustomFilters;
			} else if (useSlices && sliceOptions && sliceOptions.length) {
				filters = setSliceFilter(filters, activeLens, _.first(sliceOptions));
			}
		}

		const searchTermState = initialSearchTerm
			? {
					eventSearchFilter: createEventSearchFilter(
						this.props.types,
						initialSearchTerm,
						tailTypes,
					),
					searchFilter: createSearchFilter(tailTypes, initialSearchTerm),
					searchTerm: initialSearchTerm,
			  }
			: {};

		this.state = {
			activeLens: _.get(activeLens, 'slug', null),
			eventSearchFilter: null,
			filters,
			options: {
				page: 0,
				totalPages: Infinity,
				limit: 100,
				sortBy: ['created_at'],
				sortDir: 'desc',
			},
			query: null,
			redirectTo: null,
			searchFilter: null,
			searchTerm: '',
			tailTypes,
			...searchTermState,
		};

		this.loadViewWithFilters = _.debounce(this.loadViewWithFilters, 350);
		this.loadViewWithFilters(filters);
	}

	// This lazy require fixes cicular dependency issues
	// TODO: Refactor lens architecture to avoid this problem
	getLensBySlug = (slug: string | null): LensContract | null => {
		const { getLensBySlug } = require('../../');
		return getLensBySlug(slug);
	};

	saveView = ([view]: FiltersView[]) => {
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
	};

	updateFiltersFromSummary = (filters) => {
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
	};

	updateFilters = (filters) => {
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
	};

	updateSearch = (newSearchTerm: string) => {
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
	};

	setLens = (slug) => {
		const lens = this.getLensBySlug(slug);
		const { query, types, useSlices } = this.props;
		if (!lens) {
			return;
		}

		if (this.state.activeLens === lens.slug) {
			return;
		}

		// Some lenses ignore the slice filter, so recalculate the filters using
		// the new lens.
		const sliceOptions = helpers.getSchemaSlices(query, types);
		const filters = useSlices
			? setSliceFilter(this.state.filters, lens, _.first(sliceOptions))
			: this.state.filters;

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
	};

	handleSortOptionsChange = (sortOptions) => {
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
	};

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
		// TODO: improve backend sort efficiency so we can apply a default sort here
		const options = _.merge(
			{
				limit: 30,
				page: 0,
			},
			this.state.options,
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
		const { actions, card, query, onQueryUpdate } = this.props;
		const { searchFilter } = this.state;

		// Omnisearch runs a full text query over a large set of contracts, so we apply
		// heuristics to make the query run faster. Firstly, we omit search in timelines.
		// Secondly, the top level type enum is removed. We need to resolve the root cause
		// of these slow queries and remove this heuristic.
		// See: https://jel.ly.fish/pattern-omnisearch-causes-massive-db-memory-consumption-8022ce1
		const isOmniSearch =
			query.allOf && query.allOf[0] && query.allOf[0].$id === 'omnisearch';

		const targetFilters = _.compact(filters);
		const searchFilters = _.compact([searchFilter]);
		if (searchFilters.length === 1) {
			targetFilters.push(searchFilters[0]);
		} else if (searchFilters.length > 1) {
			targetFilters.push({ anyOf: searchFilters });
		}

		// TODO:
		// 1. Store custom filters in localStorage
		// 2. Retrieve and load custom filters on startup
		// 3. Add a "reset" button for removing custom filters
		if (!deepEqual(this.props.userCustomFilters, filters)) {
			actions.setUserCustomFilters(card.id, filters);
		}

		const viewQuery = unifyQuery(
			isOmniSearch ? { allOf: [] } : clone(query),
			targetFilters,
		);

		if (onQueryUpdate) {
			onQueryUpdate(viewQuery);
		}

		this.setState({
			query: viewQuery,
		});
	}

	render() {
		const { card, isMobile, types, channel, hideFooter, user } = this.props;

		const {
			tailTypes,
			activeLens,
			redirectTo,
			filters,
			searchFilter,
			searchTerm,
		} = this.state;

		if (redirectTo) {
			return <Redirect push to={redirectTo} />;
		}

		const lens = this.getLensBySlug(activeLens);
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
						lens={lens}
						options={options}
						onResultsChange={this.props.onResultsChange}
					>
						{({ results, nextPage, hasNextPage, lenses }) => (
							<>
								<Header
									lenses={lenses}
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
									pageOptions={{
										sortBy: options.sortBy,
										sortDir: options.sortDir,
									}}
									onSortOptionsChange={this.handleSortOptionsChange}
								/>

								<Content
									user={user}
									card={card}
									results={results}
									nextPage={nextPage}
									hasNextPage={hasNextPage}
									lenses={lenses}
									lens={lens}
									channel={channel}
									tailTypes={tailTypes || []}
									pageOptions={options}
									hideFooter={!!hideFooter}
								/>
							</>
						)}
					</LiveCollection>
				)}
			</Flex>
		);
	}
}
