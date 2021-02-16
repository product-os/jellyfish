/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import clone from 'deep-copy'
import {
	circularDeepEqual
} from 'fast-equals'
import skhema from 'skhema'
import update from 'immutability-helper'
import * as _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import {
	Redirect
} from 'react-router-dom'
import * as redux from 'redux'
import {
	Box,
	Flex,
	SchemaSieve
} from 'rendition'
import {
	v4 as uuid
} from 'uuid'
import {
	addNotification,
	helpers,
	Icon,
	withResponsiveContext
} from '@balena/jellyfish-ui-components'
import {
	actionCreators,
	analytics,
	selectors,
	sdk
} from '../../../core'
import {
	getLenses
} from '../../'
import Header from './Header'
import Content from './Content'

import {
	USER_FILTER_NAME,
	FULL_TEXT_SEARCH_TITLE,
	EVENTS_FULL_TEXT_SEARCH_TITLE,
	TIMELINE_FILTER_PROP
} from './constants'

const getActiveLens = (lenses, lensSlug) => {
	return _.find(lenses, {
		slug: lensSlug
	}) || _.first(lenses)
}

const getSearchViewId = (targetId) => `$$search-${targetId}`

// Search the view card's filters for a slice filter. If one is found
// that matches one of the slice options, return that slice option
const getActiveSliceFromFilter = (sliceOptions, viewCard) => {
	const viewFilters = _.get(viewCard, [ 'data', 'allOf' ], [])
	for (const slice of sliceOptions) {
		const sliceFilter = createSliceFilter(slice)
		for (const viewFilter of viewFilters) {
			const filterOptions = _.get(viewFilter, [ 'schema', 'anyOf' ])
			const activeSliceFilter = _.find(filterOptions, sliceFilter)
			if (activeSliceFilter) {
				return slice
			}
		}
	}
	return null
}

const createSliceFilter = (slice) => {
	const filter = {
		// Use the slice path as a unique ID, as we don't want multiple slice constraints
		// on the same path
		$id: slice.value.path,
		title: USER_FILTER_NAME,
		description: `${slice.title}`,
		type: 'object',
		properties: {}
	}

	if (!slice.value.value) {
		return filter
	}

	_.set(filter, slice.value.path, {
		const: slice.value.value
	})

	const keys = slice.value.path.split('.')

	// Make sure that "property" keys correspond with { type: 'object' },
	// otherwise the filter won't work
	while (keys.length) {
		if (keys.pop() === 'properties') {
			_.set(filter, keys.concat('type'), 'object')
		}
	}
	return filter
}

// TODO helpers.getViewSlices() should just return a set of schemas allowing us
// to remove all the intermediary data formats
const getSliceOptions = (card, types) => {
	const slices = helpers.getViewSlices(card, types)
	if (!slices) {
		return []
	}
	const sliceOptions = []
	for (const slice of slices) {
		for (const sliceValue of slice.values) {
			sliceOptions.push({
				title: `${slice.title}: ${sliceValue}`,
				value: {
					path: slice.path,
					value: sliceValue
				}
			})
		}

		sliceOptions.push({
			title: `${slice.title}: All`,
			value: {
				path: slice.path
			}
		})
	}

	return sliceOptions.length ? sliceOptions : null
}

const getDefaultSliceOption = (sliceOptions) => {
	return sliceOptions && _.last(sliceOptions)
}

const createSyntheticViewCard = (view, filters) => {
	const syntheticViewCard = clone(view)
	const originalFilters = view
		? _.reject(view.data.allOf, {
			name: USER_FILTER_NAME
		})
		: []
	syntheticViewCard.data.allOf = originalFilters

	// If the filter users the timeline filter prop, add a $$links expression to
	// additionally filter by the timeline
	// TODO: Make the filters component generate $$links statements natively
	filters.forEach((filter) => {
		const linkSchema = _.get(filter, [ 'anyOf', '0', 'properties', TIMELINE_FILTER_PROP ])
		const schema = linkSchema
			? {
				$$links: {
					'has attached element': linkSchema
				}
			}
			: _.assign(_.omit(filter, '$id'), {
				type: 'object'
			})

		// $$link queries don't work with full text search as they `anyOf` logic
		// can't express the query on timeline elements, so the subschema has to be
		// stripped from the full text search query schema
		if (schema.title === FULL_TEXT_SEARCH_TITLE) {
			_.forEach(
				_.filter(schema.anyOf, 'anyOf'),
				(subSchema) => {
					subSchema.anyOf = subSchema.anyOf.filter((item) => {
						return !item.properties.$$links
					})
				}
			)
		}

		syntheticViewCard.data.allOf.push({
			name: USER_FILTER_NAME,
			schema
		})
	})

	return syntheticViewCard
}

const createSearchFilter = (types, term) => {
	if (!term) {
		return null
	}
	const searchFilterAnyOf = _.compact(
		types.map((type) => {
			const filterForType = helpers.createFullTextSearchFilter(type.data.schema, term, {
				fullTextSearchFieldsOnly: true
			})
			return filterForType && skhema.merge([
				{
					description: types.length > 1
						? `Any ${type.slug} field contains ${term}`
						: `Any field contains ${term}`
				},
				filterForType,
				{
					required: [ 'type' ],
					properties: {
						type: {
							type: 'string',
							const: `${type.slug}@${type.version}`
						}
					}
				}
			])
		})
	)
	return searchFilterAnyOf.length ? {
		anyOf: searchFilterAnyOf,
		description: `Full text search for '${term}'`,
		title: FULL_TEXT_SEARCH_TITLE,
		$id: FULL_TEXT_SEARCH_TITLE
	} : null
}

const createEventSearchFilter = (types, term) => {
	if (!term) {
		return null
	}
	const messageType = helpers.getType('message', types)
	const eventSchema = messageType.data.schema
	const attachedElementSearchFilter = helpers.createFullTextSearchFilter(eventSchema, term, {
		fullTextSearchFieldsOnly: true
	})
	if (!attachedElementSearchFilter) {
		return null
	}
	const attachedElement = skhema.merge([
		{
			type: 'object',
			required: [ 'type' ],
			properties: {
				type: {
					enum: [ 'message@1.0.0', 'whisper@1.0.0' ]
				}
			}
		},
		attachedElementSearchFilter
	])
	return {
		type: 'object',
		$$links: {
			'has attached element': attachedElement
		},
		description: `Full text search in timeline for '${term}'`,
		title: EVENTS_FULL_TEXT_SEARCH_TITLE,
		$id: EVENTS_FULL_TEXT_SEARCH_TITLE
	}
}

export class ViewRenderer extends React.Component {
	constructor (props) {
		super(props)

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
				sortBy: [ 'created_at' ]
			}
		}

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
			'setSortByField'
		]
		methods.forEach((method) => {
			this[method] = this[method].bind(this)
		})

		this.loadViewWithFilters = _.debounce(this.loadViewWithFilters, 350)
	}

	saveView ([ view ]) {
		if (!view) {
			return
		}

		const newView = this.createView(view)

		sdk.card.create(newView)
			.then((card) => {
				analytics.track('element.create', {
					element: {
						type: 'view'
					}
				})
				this.setState({
					redirectTo: `/${card.slug || card.id}`
				})
			})
			.catch((error) => {
				addNotification('danger', error.message)
			})
	}

	updateFiltersFromSummary (filters) {
		// Separate out the search filter from the other filters
		const [ searchFilters, filtersWithoutSearch ] = _.partition(filters, {
			title: FULL_TEXT_SEARCH_TITLE
		})

		const activeSliceFilterId = _.get(this.state.activeSlice, [ 'value', 'path' ])
		const sliceFilter = activeSliceFilterId && filtersWithoutSearch.find((item) => {
			return item.anyOf && item.anyOf[0].$id === activeSliceFilterId
		})

		if (!sliceFilter && _.get(this.state, [ 'sliceOptions', 'length' ])) {
			this.setSlice({
				value: getDefaultSliceOption(this.state.sliceOptions)
			})
		}

		if (searchFilters.length) {
			this.updateFilters(filtersWithoutSearch)
		} else {
			// If the search filter has been removed by the Filters summary,
			// update our component state accordingly before updating filters
			this.setState({
				eventSearchFilter: null,
				searchFilter: null,
				searchTerm: ''
			}, () => {
				this.updateFilters(filtersWithoutSearch)
			})
		}
	}

	updateFilters (filters) {
		this.setState((prevState) => {
			return {
				options: update(prevState.options, {
					page: {
						$set: 0
					}
				}),
				filters
			}
		}, () => {
			this.loadViewWithFilters(filters)
		})
	}

	updateSearch (event) {
		const newSearchTerm = event.target.value
		this.setState((prevState) => {
			return {
				options: update(prevState.options, {
					page: {
						$set: 0
					},
					totalPages: {
						$set: Infinity
					}
				}),
				eventSearchFilter: createEventSearchFilter(this.props.types, newSearchTerm),
				searchFilter: createSearchFilter(this.state.tailTypes, newSearchTerm),
				searchTerm: newSearchTerm
			}
		}, () => {
			this.loadViewWithFilters(this.state.filters)
		})
	}

	setLens (slug) {
		const lens = _.find(this.props.lenses, {
			slug
		})
		if (!lens) {
			return
		}

		if (this.state.activeLens === lens.slug) {
			return
		}

		const reloadRequired = this.state.options.page !== 0

		this.setState((prevState) => {
			return {
				options: update(prevState.options, {
					page: {
						$set: 0
					}
				}),
				activeLens: lens.slug
			}
		}, () => {
			if (reloadRequired) {
				this.loadViewWithFilters(this.state.filters)
			}
		})

		this.props.actions.setViewLens(this.props.card.id, lens.slug)
	}

	setSlice ({
		value
	}) {
		this.setState({
			activeSlice: value
		})
		const filter = createSliceFilter(value)

		// Remove any pre-existing filter with the same $id
		const parsedFilters = this.state.filters.filter((item) => {
			return item.anyOf && item.anyOf[0].$id !== filter.$id
		})

		parsedFilters.push({
			$id: filter.$id,
			anyOf: [ filter ]
		})

		this.updateFilters(parsedFilters)

		this.props.actions.setViewSlice(this.props.card.id, value)
	}

	setPage (page) {
		if (page + 1 >= this.state.options.totalPages) {
			return
		}
		this.setState(({
			options
		}) => ({
			options: {
				...options,
				page
			}
		}), () => {
			this.updateView()
		})
	}

	updateView () {
		const {
			channel
		} = this.props
		const {
			filters, options, activeLens
		} = this.state
		const syntheticViewCard = createSyntheticViewCard(channel.data.head, filters)
		const queryOptions = this.getQueryOptions(activeLens)
		this.props.actions.loadMoreViewData(syntheticViewCard, queryOptions)
			.then((data) => {
				if (data.length < options.limit) {
					this.setState({
						options: {
							...options,
							totalPages: options.page + 1
						}
					})
				}
			})
	}

	setSortByField (field) {
		this.setState(({
			options
		}) => ({
			options: {
				...options,
				page: 0,
				totalPages: Infinity,
				sortBy: field
			}
		}), () => {
			this.loadViewWithFilters(this.state.filters)
		})
	}

	componentDidMount () {
		this.bootstrap(this.props.channel)
	}

	componentWillUnmount () {
		const {
			head
		} = this.props.channel.data

		this.props.actions.clearViewData(head.id)
	}

	bootstrap (channel) {
		const {
			head,
			seed
		} = channel.data
		if (!this.props.user) {
			throw new Error('Cannot bootstrap a view without an active user')
		}
		if (!head) {
			return
		}
		this.props.actions.clearViewData(head.id)
		const filters = head
			? _.map(_.filter(head.data.allOf, {
				name: USER_FILTER_NAME
			}), 'schema')
			: []

		const activeLens = _.get(getActiveLens(this.props.lenses, this.props.userActiveLens), [ 'slug' ], null)

		const viewTailTypes = helpers.getTypesFromViewCard(head)

		const tailTypes = _.map(viewTailTypes, (tailType) => {
			return helpers.getType(tailType, this.props.types)
		})

		let activeSlice = null

		const sliceOptions = getSliceOptions(head, this.props.types)

		if (sliceOptions && sliceOptions.length) {
			// Default to setting the active slice based on the user's preference
			if (this.props.userActiveSlice) {
				activeSlice = _.find(sliceOptions, this.props.userActiveSlice)
			}

			// Check if the view defines a slice filter
			activeSlice = activeSlice || getActiveSliceFromFilter(sliceOptions, head)

			// Otherwise just select the first slice option
			activeSlice = activeSlice || _.first(sliceOptions)

			const filter = createSliceFilter(activeSlice)

			const existingFilter = filters.find((item) => {
				return item.anyOf && item.anyOf[0].$id === filter.$id
			})

			// If a matching filter already exists, don't add it twice
			if (!existingFilter) {
				filters.push({
					$id: filter.$id,
					anyOf: [ filter ]
				})
			}
		}

		const initialSearchTerm = _.get(seed, [ 'searchTerm' ])
		const searchTermState = initialSearchTerm ? {
			eventSearchFilter: createEventSearchFilter(this.props.types, initialSearchTerm),
			searchFilter: createSearchFilter(tailTypes, initialSearchTerm),
			searchTerm: initialSearchTerm
		} : {}

		// Set default state
		this.setState({
			activeLens,
			filters,
			tailTypes,
			activeSlice,
			sliceOptions,
			...searchTermState,

			// Mark as ready
			ready: true
		}, () => {
			this.loadViewWithFilters(filters)
		})
	}

	// TODO: Make all lenses handle pagination and remove this exception.
	// For this to work properly there needs to be a mechanism for returning the
	// total available items from the API.
	getQueryOptions (lensSlug) {
		const lens = getActiveLens(this.props.lenses, lensSlug)

		// TODO: improve backend sort efficiency so we can apply a default sort here
		const options = _.merge({
			limit: 30,
			page: 0
		},
		this.state.options,
		_.get(lens, [ 'data', 'queryOptions' ])
		)

		options.page = this.state.options.page
		options.sortBy = this.state.options.sortBy

		// The backend will throw an error if you make a request with a "limit"
		// higher than 1000, so normalize it here
		if (options.limit > 1000) {
			options.limit = 1000
		}

		return options
	}

	static getDerivedStateFromProps (nextProps, prevState) {
		if (nextProps.tail && nextProps.tail.length < 30) {
			return {
				options: Object.assign({}, prevState.options, {
					totalPages: 1
				})
			}
		}

		return null
	}

	componentDidUpdate (prevProps) {
		if (this.props.channel.data.target !== prevProps.channel.data.target) {
			this.setState({
				ready: false
			})
		}
		if (!circularDeepEqual(this.props.channel.data.target, prevProps.channel.data.target)) {
			this.bootstrap(this.props.channel)
		}
		if (!this.props.channel.data.head && prevProps.channel.data.head) {
			// Convert jellyfish view into a format that rendition can understand
			this.setState({
				filters: _.map(_.filter(this.props.channel.data.head.data.allOf, {
					name: USER_FILTER_NAME
				}), (item) => {
					return {
						anyOf: [ item.schema ]
					}
				})
			})
		}
		if (!_.get(prevProps, [ 'lenses', 'length' ]) && _.get(this.props, [ 'lenses', 'length' ])) {
			const activeLens = getActiveLens(this.props.lenses, this.props.userActiveLens).slug
			this.setLens(activeLens)
		}
	}

	createView (view) {
		const {
			user,
			channel
		} = this.props
		const newView = clone(channel.data.head)
		newView.name = view.name
		newView.slug = `view-user-created-view-${uuid()}-${helpers.slugify(view.name)}`
		if (!newView.data.allOf) {
			newView.data.allOf = []
		}
		newView.data.allOf = _.reject(newView.data.allOf, {
			name: USER_FILTER_NAME
		})
		newView.data.actor = user.id
		newView.markers = [ user.slug ]
		view.filters.forEach((filter) => {
			newView.data.allOf.push({
				name: USER_FILTER_NAME,
				schema: _.assign(SchemaSieve.unflattenSchema(filter), {
					type: 'object'
				})
			})
		})
		Reflect.deleteProperty(newView, 'id')
		Reflect.deleteProperty(newView, 'created_at')
		Reflect.deleteProperty(newView.data, 'namespace')
		return newView
	}

	loadViewWithFilters (filters) {
		const {
			actions,
			channel
		} = this.props
		const {
			searchFilter, activeLens, eventSearchFilter
		} = this.state
		const targetFilters = _.compact([ ...filters, searchFilter ])
		const eventFilters = _.compact([ ...filters, eventSearchFilter ])

		const syntheticViewCard = createSyntheticViewCard(channel.data.head, targetFilters)
		const eventSyntheticViewCard = createSyntheticViewCard(channel.data.head, eventFilters)

		// Use a different id for the event search view as this is the key used by the redux cache
		eventSyntheticViewCard.id = getSearchViewId(eventSyntheticViewCard.id)

		const options = this.getQueryOptions(activeLens)

		actions.clearViewData(syntheticViewCard)
		actions.clearViewData(eventSyntheticViewCard)

		actions.loadViewData(syntheticViewCard, options)
		if (eventSearchFilter) {
			actions.loadViewData(eventSyntheticViewCard, options)
		} else {
			actions.setViewData(eventSyntheticViewCard, [])
		}
	}

	render () {
		const {
			lenses,
			channel,
			isMobile,
			tail
		} = this.props

		const {
			head
		} = channel.data

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
			searchTerm
		} = this.state

		if (!ready || !head || _.isEmpty(head.data)) {
			return (
				<Box p={3}>
					<Icon spin name="cog"/>
				</Box>
			)
		}

		if (redirectTo) {
			return <Redirect push to={redirectTo} />
		}

		const lens = getActiveLens(lenses, activeLens)

		return (
			<Flex
				flex={this.props.flex}
				className={`column--${head ? head.slug || head.type.split('@')[0] : 'unknown'}`}
				flexDirection="column"
				style={{
					height: '100%', overflowY: 'auto', position: 'relative'
				}}
			>
				<Header
					isMobile={isMobile}
					sliceOptions={sliceOptions}
					activeSlice={activeSlice}
					setSlice={this.setSlice}
					lenses={lenses}
					setLens={(event) => {
						this.setLens(event.currentTarget.dataset.slug)
					}}
					lens={lens}
					filters={filters}
					tailTypes={tailTypes}
					updateFilters={this.updateFilters}
					saveView={this.saveView}
					channel={channel}
					searchFilter={searchFilter}
					searchTerm={searchTerm}
					updateSearch={this.updateSearch}
					updateFiltersFromSummary={this.updateFiltersFromSummary}
					pageOptions={options}
					setSortByField={this.setSortByField}
					timelineFilter={TIMELINE_FILTER_PROP}
				/>
				<Flex height="100%" minHeight="0" mt={filters.length ? 0 : 3}>
					<Content
						lens={lens}
						activeLens={activeLens}
						tail={tail}
						channel={channel}
						getQueryOptions={this.getQueryOptions}
						tailTypes={tailTypes}
						setPage={this.setPage}
						pageOptions={options}
					/>
				</Flex>
			</Flex>
		)
	}
}

const mapStateToProps = (state, ownProps) => {
	const target = ownProps.channel.data.head.id
	const targetTail = selectors.getViewData(state, target)
	const timelineSearchTail = selectors.getViewData(state, getSearchViewId(target))
	const tail = (targetTail && timelineSearchTail)
		? _.unionBy(targetTail, timelineSearchTail, 'id')
		: null
	const user = selectors.getCurrentUser(state)
	const lenses = tail && tail.length ? getLenses('list', tail, user, 'data.icon') : []
	return {
		channels: selectors.getChannels(state),
		tail,
		lenses,
		types: selectors.getTypes(state),
		user,
		userActiveLens: selectors.getUsersViewLens(state, target),
		userActiveSlice: selectors.getUsersViewSlice(state, target)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'clearViewData',
				'loadViewData',
				'loadMoreViewData',
				'setViewData',
				'setViewLens',
				'setViewSlice'
			]), dispatch)
	}
}

const WrappedViewRenderer = redux.compose(
	connect(mapStateToProps, mapDispatchToProps),
	withResponsiveContext
)(ViewRenderer)

const lens = {
	slug: 'lens-view',
	type: 'lens',
	version: '1.0.0',
	name: 'View lens',
	data: {
		type: 'view',
		icon: 'filter',
		format: 'full',
		renderer: WrappedViewRenderer,
		filter: {
			type: 'object',
			properties: {
				type: {
					const: 'view@1.0.0'
				}
			}
		}
	}
}

export default lens
