/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import clone from 'deep-copy'
import {
	circularDeepEqual
} from 'fast-equals'
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
	actionCreators,
	analytics,
	selectors,
	sdk
} from '../../../core'
import * as helpers from '../../../../../lib/ui-components/services/helpers'
import {
	getLensBySlug
} from '../../'
import Icon from '../../../../../lib/ui-components/shame/Icon'
import {
	withResponsiveContext
} from '../../../../../lib/ui-components/hooks/ResponsiveProvider'
import Header from './Header'
import Content from './Content'

import {
	USER_FILTER_NAME,
	FULL_TEXT_SEARCH_TITLE,
	TIMELINE_FILTER_PROP
} from './constants'

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
			schema.anyOf[0].anyOf = schema.anyOf[0].anyOf.filter((item) => {
				return !item.properties.$$links
			})
		}

		syntheticViewCard.data.allOf.push({
			name: USER_FILTER_NAME,
			schema
		})
	})

	return syntheticViewCard
}

const createSearchFilter = (schema, term) => {
	return term ? {
		anyOf: [
			helpers.createFullTextSearchFilter(schema, term)
		],
		title: FULL_TEXT_SEARCH_TITLE,
		$id: FULL_TEXT_SEARCH_TITLE
	} : null
}

class ViewRenderer extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			redirectTo: null,
			searchTerm: '',
			searchFilter: null,
			filters: [],
			ready: false,
			tailType: null,
			activeLens: null,
			activeSlice: null,
			options: {
				page: 0,
				totalPages: Infinity,
				limit: 30
			}
		}

		const methods = [
			'saveView',
			'setLens',
			'setPage',
			'setSlice',
			'updateView',
			'updateSearch',
			'updateFiltersFromSummary',
			'updateFilters',
			'getQueryOptions'
		]
		methods.forEach((method) => {
			this[method] = this[method].bind(this)
		})

		this.updateFilters = _.debounce(this.updateFilters, 350)
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
				this.props.actions.addNotification('danger', error.message)
			})
	}

	updateFiltersFromSummary (filters) {
		// Separate out the search filter from the other filters
		const [ searchFilters, filtersWithoutSearch ] = _.partition(filters, {
			title: FULL_TEXT_SEARCH_TITLE
		})

		if (searchFilters.length) {
			this.updateFilters(filtersWithoutSearch)
		} else {
			// If the search filter has been removed by the Filters summary,
			// update our component state accordingly before updating filters
			this.setState({
				searchFilter: null,
				searchTerm: ''
			}, () => {
				this.updateFilters(filtersWithoutSearch)
			})
		}
	}

	updateFilters (filters) {
		const {
			head
		} = this.props.channel.data
		if (head) {
			this.loadViewWithFilters(head, _.compact([ ...filters, this.state.searchFilter ]))
		}
		this.setState({
			filters
		})
	}

	updateSearch (event) {
		const schema = _.get(this.state, [ 'tailType', 'data', 'schema' ])
		this.setState({
			searchFilter: createSearchFilter(schema, event.target.value),
			searchTerm: event.target.value
		}, () => {
			this.updateFilters(this.state.filters)
		})
	}

	setLens (event) {
		const slug = event.currentTarget.dataset.slug
		const lens = _.find(this.lenses, {
			slug
		})
		if (!lens) {
			return
		}

		if (this.state.activeLens === lens.slug) {
			return
		}

		const {
			head
		} = this.props.channel.data
		const syntheticViewCard = createSyntheticViewCard(head, this.state.filters)

		this.props.actions.clearViewData(head.id)
		this.props.actions.loadViewResults(
			syntheticViewCard,
			this.getQueryOptions(lens.slug)
		)

		this.setState({
			activeLens: lens.slug
		})

		this.props.actions.setViewLens(this.props.card.id, lens.slug)
	}

	setSlice (event) {
		const {
			value
		} = event
		this.setState({
			activeSlice: value
		})
		const filter = createSliceFilter(value)

		const {
			head
		} = this.props.channel.data

		const filters = head
			? _.map(_.filter(head.data.allOf, {
				name: USER_FILTER_NAME
			}), 'schema')
			: []

		// Remove any pre-existing filter with the same $id
		const parsedFilters = filters.filter((item) => {
			return item.anyOf && item.anyOf[0].$id !== filter.$id
		})

		parsedFilters.push({
			anyOf: [ filter ]
		})

		this.updateFilters(parsedFilters)
	}

	setPage (page) {
		const {
			channel
		} = this.props
		if (page + 1 >= this.state.options.totalPages) {
			return null
		}
		const options = Object.assign({}, this.state.options, {
			page
		})
		if (!channel) {
			return null
		}
		this.setState({
			options
		}, () => this.updateView(channel, this.state))

		return options
	}

	updateView (channel, state) {
		// There is no need to catch the response here, as `loadViewResults` will
		// show an error notification if anything goes wrong
		this.props.actions.loadViewResults(
			createSyntheticViewCard(channel.data.head, state.filters),
			this.getQueryOptions(state.activeLens)
		)
			.then((data) => {
				if (data.length < state.options.limit) {
					this.setState({
						options: Object.assign({}, state.options, {
							totalPages: state.options.page + 1
						})
					})
				}
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
			head
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

		const lenses = _.chain(head)
			.get([ 'data', 'lenses' ])
			.map((slug) => { return getLensBySlug(slug) })
			.compact()
			.value()

		this.lenses = lenses

		const activeLens = _.find(lenses, {
			slug: this.props.userActiveLens
		})
			? this.props.userActiveLens
			: _.get(lenses, [ '0', 'slug' ])

		const tailType = _.find(this.props.types, {
			slug: helpers.getTypeFromViewCard(head).split('@')[0]
		}) || null

		let activeSlice = null

		const sliceOptions = getSliceOptions(head, this.props.types)

		if (sliceOptions && sliceOptions.length) {
			activeSlice = _.first(sliceOptions)

			const filter = createSliceFilter(activeSlice)

			const existingFilter = filters.find((item) => {
				return item.anyOf && item.anyOf[0].$id === filter.$id
			})

			// If a matching filter already exists, don't add it twice
			if (!existingFilter) {
				filters.push({
					anyOf: [ filter ]
				})
			}
			this.loadViewWithFilters(head, _.compact([ ...filters, this.state.searchFilter ]))
		} else {
			const queryOptions = this.getQueryOptions(activeLens)
			this.props.actions.streamView(head.id, queryOptions)
			this.props.actions.loadViewResults(head.id, queryOptions)
		}

		// Set default state
		this.setState({
			activeLens,
			filters,
			tailType,
			activeSlice,
			sliceOptions,

			// Mark as ready
			ready: true
		})
	}

	// TODO: Make all lenses handle pagination and remove this exception.
	// For this to work properly there needs to be a mechanism for returning the
	// total available items from the API.
	getQueryOptions (lensSlug) {
		const lens = lensSlug
			? _.find(this.lenses, {
				slug: lensSlug
			})
			: _.first(this.lenses)

		// TODO: improve backend sort efficiency so we can apply a default sort here
		const options = _.merge({
			limit: 30,
			page: 0
		},
		this.state.options,
		_.get(lens, [ 'data', 'queryOptions' ])
		)

		options.page = this.state.options.page

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
				options: Object.assign(prevState.options, {
					totalPages: 1
				})
			}
		}

		return null
	}

	componentDidUpdate (nextProps) {
		if (this.props.channel.data.target !== nextProps.channel.data.target) {
			this.setState({
				ready: false
			})
		}
		if (!circularDeepEqual(this.props.channel.data.target, nextProps.channel.data.target)) {
			this.bootstrap(nextProps.channel)
		}
		if (!this.props.channel.data.head && nextProps.channel.data.head) {
			// Convert jellyfish view into a format that rendition can understand
			this.setState({
				filters: _.map(_.filter(nextProps.channel.data.head.data.allOf, {
					name: USER_FILTER_NAME
				}), (item) => {
					return {
						anyOf: [ item.schema ]
					}
				})
			})
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

	loadViewWithFilters (view, filters) {
		const syntheticViewCard = createSyntheticViewCard(view, filters)
		const options = this.getQueryOptions(this.state.activeLens)
		this.props.actions.clearViewData(syntheticViewCard)
		this.props.actions.streamView(syntheticViewCard, options)
		return this.props.actions.loadViewResults(syntheticViewCard, options)
	}

	render () {
		const {
			channel,
			isMobile,
			tail
		} = this.props

		const {
			head
		} = channel.data

		const {
			tailType,
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

		const lens = _.find(this.lenses, {
			slug: activeLens
		}) || this.lenses[0]

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
					lenses={this.lenses}
					setLens={this.setLens}
					lens={lens}
					filters={filters}
					tailType={tailType}
					updateFilters={this.updateFilters}
					saveView={this.saveView}
					channel={channel}
					searchFilter={searchFilter}
					searchTerm={searchTerm}
					updateSearch={this.updateSearch}
					updateFiltersFromSummary={this.updateFiltersFromSummary}
				/>
				<Flex height="100%" minHeight="0" mt={filters.length ? 0 : 3}>
					<Content
						lens={lens}
						activeLens={activeLens}
						tail={tail}
						channel={channel}
						getQueryOptions={this.getQueryOptions}
						tailType={tailType}
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
	return {
		channels: selectors.getChannels(state),
		tail: selectors.getViewData(state, target),
		types: selectors.getTypes(state),
		user: selectors.getCurrentUser(state),
		userActiveLens: selectors.getUsersViewLens(state, target)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(
			_.pick(actionCreators, [
				'addNotification',
				'clearViewData',
				'loadViewResults',
				'setViewLens',
				'streamView'
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
