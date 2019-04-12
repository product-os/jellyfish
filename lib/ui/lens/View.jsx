/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import * as _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import {
	Box,
	Button,
	Flex,
	SchemaSieve,
	Select
} from 'rendition'
import Filters from '../components/Filters'
import {
	actionCreators,
	analytics,
	selectors,
	sdk
} from '../core'
import * as helpers from '../services/helpers'
import LensService from './'
import ButtonGroup from '../shame/ButtonGroup'
import {
	CloseButton
} from '../shame/CloseButton'
import Icon from '../shame/Icon'

const USER_FILTER_NAME = 'user-generated-filter'

const TIMELINE_FILTER_PROP = '$$links'

const createSyntheticViewCard = (view, filters) => {
	const syntheticViewCard = _.cloneDeep(view)
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
		if (schema.title === 'full_text_search') {
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

class ViewRenderer extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			filters: [],
			ready: false,
			tailType: null,
			activeLens: null,
			activeSlice: null,
			options: {
				page: 0,
				totalPages: Infinity,
				limit: 30,
				sortBy: 'created_at',
				sortDir: 'desc'
			}
		}

		const methods = [
			'saveView',
			'setLens',
			'setPage',
			'setSlice',
			'updateFilters'
		]
		methods.forEach((method) => {
			this[method] = this[method].bind(this)
		})

		this.updateFilters = _.debounce(this.updateFilters, 350)
	}

	saveView ([ view ]) {
		sdk.card.create(this.createView(view))
			.then((card) => {
				analytics.track('element.create', {
					element: {
						type: 'view'
					}
				})
				this.props.actions.addChannel(helpers.createChannel({
					cardType: 'view',
					target: card.id,
					head: card,
					parentChannel: this.props.channels[0].id
				}))
			})
			.catch((error) => {
				this.props.actions.addNotification('danger', error.message)
			})
	}

	updateFilters (filters) {
		const {
			head
		} = this.props.channel.data
		if (head) {
			this.loadViewWithFilters(head, filters)
		}
		this.setState({
			filters
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
		this.setState({
			activeLens: lens.slug
		})

		this.props.actions.setViewLens(this.props.card.id, lens.slug)
	}

	setSlice (event) {
		const slug = event.target.value
		this.setState({
			activeSlice: slug
		})
	}

	async setPage (page) {
		const {
			channel
		} = this.props
		if (page + 1 >= this.state.options.totalPages) {
			return
		}
		const options = _.merge(this.state.options, {
			page
		})
		if (!channel) {
			return
		}
		this.setState({
			options
		})
		const syntheticViewCard = createSyntheticViewCard(channel.data.head, this.state.filters)
		const data = await this.props.actions.loadViewResults(
			syntheticViewCard,
			this.getQueryOptions(this.state.activeLens)
		)
		if (data.length < this.state.options.limit) {
			this.setState({
				options: Object.assign(this.state.options, {
					totalPages: this.state.options.page + 1
				})
			})
		}
	}

	componentDidMount () {
		this.bootstrap(this.props.channel)
	}

	bootstrap (channel) {
		const {
			head, options
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
			.map((slug) => { return LensService.default.getLensBySlug(slug) })
			.compact()
			.value()

		this.lenses = lenses

		const activeLens = _.find(lenses, {
			slug: this.props.userActiveLens
		})
			? this.props.userActiveLens
			: _.get(lenses, [ '0', 'slug' ])

		const tailType = _.find(this.props.types, {
			slug: helpers.getTypeFromViewCard(head)
		}) || null
		if (options && options.slice) {
			const {
				slice
			} = options
			const filter = {
				name: USER_FILTER_NAME,
				title: 'is',
				description: `${slice.title} is ${slice.value}`,
				type: 'object',
				properties: {}
			}
			_.set(filter, slice.path, {
				const: slice.value
			})
			const keys = slice.path.split('.')

			// Make sure that "property" keys correspond with { type: 'object' },
			// otherwise the filter won't work
			while (keys.length) {
				if (keys.pop() === 'properties') {
					_.set(filter, keys.concat('type'), 'object')
				}
			}
			filters.push({
				anyOf: [ filter ]
			})
			this.loadViewWithFilters(head, filters)
		} else {
			this.props.actions.streamView(head.id)
			this.props.actions.loadViewResults(head.id, this.getQueryOptions(activeLens))
		}

		// Set default state
		this.setState({
			activeLens,
			filters,
			tailType,

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
		const options = _.merge({
			limit: 30,
			page: 0,
			sortBy: 'created_at',
			sortDir: 'desc'
		},
		this.state.options,
		_.get(lens, [ 'data', 'queryOptions' ])
		)

		options.page = this.state.options.page

		return options
	}

	componentWillReceiveProps (nextProps) {
		// TODO: Get an actual total count from the API
		if (nextProps.tail && nextProps.tail.length < 30) {
			this.setState({
				options: Object.assign(this.state.options, {
					totalPages: 1
				})
			})
		}

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
	openChannel (card) {
		this.props.actions.addChannel(helpers.createChannel({
			cardType: card.type,
			target: card.id,
			head: card,
			parentChannel: this.props.channel.id
		}))
	}
	createView (view) {
		const newView = _.cloneDeep(this.props.channel.data.head)
		const {
			user
		} = this.props
		newView.name = view.name
		newView.slug = `view-user-created-view-${sdk.utils.slugify(view.name)}`
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
		return newView
	}

	loadViewWithFilters (view, filters) {
		const syntheticViewCard = createSyntheticViewCard(view, filters)
		this.props.actions.clearViewData(syntheticViewCard)
		this.props.actions.streamView(syntheticViewCard)
		return this.props.actions.loadViewResults(syntheticViewCard, this.getQueryOptions(this.state.activeLens))
	}
	render () {
		const {
			head
		} = this.props.channel.data
		if (!this.state.ready || !head || _.isEmpty(head.data)) {
			return (
				<Box p={3}>
					<Icon spin name="cog"/>
				</Box>
			)
		}
		const {
			types
		} = this.props

		const tail = _.sortBy(this.props.tail, this.state.options.sortBy)

		const {
			tailType, activeLens, activeSlice
		} = this.state
		const lenses = this.lenses
		const useFilters = Boolean(tailType) && tailType.slug !== 'view'
		const lens = _.find(lenses, {
			slug: activeLens
		}) || lenses[0]
		const slices = helpers.getViewSlices(head, types)
		const lensSupportsSlices = Boolean(lens) && Boolean(lens.data.supportsSlices)

		// Always expose the created_at and updated_at field for filtering
		const schemaForFilters = _.get(_.cloneDeep(tailType), [ 'data', 'schema' ], {})
		_.set(schemaForFilters, [ 'properties', 'created_at' ], {
			title: 'Created at',
			type: 'string',
			format: 'date-time'
		})
		_.set(schemaForFilters, [ 'properties', 'updated_at' ], {
			title: 'Last updated',
			type: 'string',
			format: 'date-time'
		})

		// Add the timeline link prop to spoof the filters component into generating
		// subschemas for the $$links property - see the createSyntheticViewCard()
		// method for how we unpack the filters
		_.set(schemaForFilters, [ 'properties', TIMELINE_FILTER_PROP ], {
			title: 'Timeline',
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						payload: {
							type: 'object',
							properties: {
								message: {
									title: 'Timeline message',
									type: 'string'
								}
							}
						}
					}
				}
			}
		})

		return (
			<Flex
				flex={this.props.flex}
				className={`column--${head ? head.slug || head.type : 'unknown'}`}
				flexDirection="column"
				style={{
					height: '100%', overflowY: 'auto', position: 'relative'
				}}
			>
				{Boolean(head) && (
					<Box>
						<Flex mt={3} justify="space-between">
							<Box flex="1" mx={3}>
								{useFilters && (
									<Box mt={0} flex="1 0 auto">
										<Filters
											schema={schemaForFilters}
											filters={this.state.filters}
											onFiltersUpdate={this.updateFilters}
											onViewsUpdate={this.saveView}
											renderMode={[ 'add', 'search' ]}
										/>
									</Box>
								)}
							</Box>

							<Flex mx={3}>
								{this.lenses.length > 1 && Boolean(lens) && (
									<ButtonGroup>
										{_.map(this.lenses, (item) => {
											return (
												<Button
													key={item.slug}
													bg={ lens && lens.slug === item.slug ? '#333' : false}
													square={true}
													data-test={`lens-selector--${item.slug}`}
													data-slug={item.slug}
													onClick={this.setLens}
												>
													<Icon name={item.data.icon}/>
												</Button>
											)
										})}
									</ButtonGroup>
								)}

								{slices && slices.length > 0 && lensSupportsSlices && (
									<Box ml={3}>
													Slice by:
										<Select
											ml={2}
											value={activeSlice}
											onChange={lensSupportsSlices ? this.setSlice : _.noop}
										>
											{_.map(slices, (slice) => {
												return (<option key={slice.path} value={slice.path}>
													{slice.title}
												</option>)
											})}
										</Select>
									</Box>
								)}

								<CloseButton
									mr={-3}
									mt={-3}
									onClick={() => {
										return this.props.actions.removeChannel(this.props.channel)
									}}
								/>
							</Flex>
						</Flex>

						{useFilters && this.state.filters.length > 0 && (
							<Box flex="1 0 auto" mb={3} mx={3}>
								<Filters
									schema={schemaForFilters}
									filters={this.state.filters}
									onFiltersUpdate={this.updateFilters}
									onViewsUpdate={this.saveView}
									renderMode={[ 'summary' ]}
								/>
							</Box>
						)}
					</Box>
				)}

				<Flex style={{
					height: '100%', minHeight: 0
				}}>
					{!tail && (
						<Box p={3}>
							<Icon spin name="cog"/>
						</Box>
					)}

					{Boolean(tail) && Boolean(lens) && (
						<lens.data.renderer
							channel={this.props.channel}
							tail={tail}
							setPage={this.setPage}
							page={this.state.options.page}
							totalPages={this.state.options.totalPages}
							type={tailType}
						/>
					)}
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
		actions: {
			addChannel: redux.bindActionCreators(actionCreators.addChannel, dispatch),
			addNotification: redux.bindActionCreators(actionCreators.addNotification, dispatch),
			clearViewData: redux.bindActionCreators(actionCreators.clearViewData, dispatch),
			loadViewResults: redux.bindActionCreators(actionCreators.loadViewResults, dispatch),
			removeChannel: redux.bindActionCreators(actionCreators.addChannel, dispatch),
			setViewLens: redux.bindActionCreators(actionCreators.setViewLens, dispatch),
			streamView: redux.bindActionCreators(actionCreators.streamView, dispatch)
		}
	}
}

const lens = {
	slug: 'lens-view',
	type: 'lens',
	version: '1.0.0',
	name: 'View lens',
	data: {
		type: 'view',
		icon: 'filter',
		renderer: connect(mapStateToProps, mapDispatchToProps)(ViewRenderer),
		filter: {
			type: 'object',
			properties: {
				type: {
					const: 'view'
				}
			}
		}
	}
}

export default lens
