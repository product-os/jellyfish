/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	circularDeepEqual
} = require('fast-equals')
const _ = require('lodash')
const React = require('react')
const {
	connect
} = require('react-redux')
const redux = require('redux')
const rendition = require('rendition')
const If = require('../components/If')
const core = require('../core')
const store = require('../core/store')
const helpers = require('../services/helpers')
const index = require('./index')
const ButtonGroup = require('../shame/ButtonGroup')
const Icon = require('../shame/Icon')
const USER_FILTER_NAME = 'user-generated-filter'
class ViewRenderer extends React.Component {
	constructor (props) {
		super(props)
		this.saveView = ([ view ]) => {
			core.sdk.card.create(this.createView(view))
				.then((card) => {
					core.analytics.track('element.create', {
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
		this.updateFilters = _.debounce((filters) => {
			const {
				head
			} = this.props.channel.data
			if (head) {
				this.loadViewWithFilters(head, filters)
			}
			this.setState({
				filters
			})
		}, 350)
		this.setLens = (event) => {
			const slug = event.currentTarget.dataset.slug
			const lens = _.find(this.state.lenses, {
				slug
			})
			if (!lens) {
				return
			}
			this.setState({
				activeLens: lens.slug
			})
		}
		this.setSlice = (event) => {
			const slug = event.target.value
			this.setState({
				activeSlice: slug
			})
		}
		this.setPage = async (page) => {
			const {
				channel
			} = this.props
			const options = _.merge(this.state.options, {
				page
			})
			if (!channel) {
				return
			}
			await this.props.actions.loadViewResults(channel.data.head.id, this.getQueryOptions(this.state.activeLens))
			this.setState({
				options
			})
		}
		this.state = {
			filters: [],
			lenses: [],
			ready: false,
			tailType: null,
			activeLens: null,
			activeSlice: null,
			options: {
				page: 0,
				limit: 50,
				sortBy: 'created_at',
				sortDir: 'desc'
			}
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
			.map((slug) => { return index.default.getLensBySlug(slug) })
			.compact()
			.value()
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
			this.props.actions.loadViewResults(head.id, this.getQueryOptions(lenses[0].slug))
		}

		// Set default state
		this.setState({
			filters,
			lenses,
			tailType,

			// Mark as ready
			ready: true
		})
	}

	// TODO: Make all lenses handle pagination and remove this exception.
	// For this to work properly there needs to be a mechanism for returning the
	// total available items from the API.
	getQueryOptions (lens) {
		return (lens || _.get(this.state.lenses, [ '0', 'slug' ])) === 'lens-interleaved'
			? this.state.options
			: {
				limit: 50,
				page: 0,
				sortBy: 'created_at',
				sortDir: 'desc'
			}
	}
	componentWillReceiveProps (nextProps) {
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
		newView.slug = `view-user-created-view-${core.sdk.utils.slugify(view.name)}`
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
				schema: _.assign(rendition.SchemaSieve.unflattenSchema(filter), {
					type: 'object'
				})
			})
		})
		Reflect.deleteProperty(newView, 'id')
		Reflect.deleteProperty(newView, 'created_at')
		return newView
	}
	loadViewWithFilters (view, filters) {
		const syntheticViewCard = _.cloneDeep(view)
		const originalFilters = view
			? _.reject(view.data.allOf, {
				name: USER_FILTER_NAME
			})
			: []
		syntheticViewCard.data.allOf = originalFilters
		filters.forEach((filter) => {
			syntheticViewCard.data.allOf.push({
				name: USER_FILTER_NAME,
				schema: _.assign(_.omit(filter, '$id'), {
					type: 'object'
				})
			})
		})
		this.props.actions.clearViewData(syntheticViewCard)
		this.props.actions.loadViewResults(syntheticViewCard, this.getQueryOptions(this.state.activeLens))
		this.props.actions.streamView(syntheticViewCard)
	}
	render () {
		const {
			head
		} = this.props.channel.data
		if (!this.state.ready || !head || _.isEmpty(head.data)) {
			return (<rendition.Box p={3}>
				<i className="fas fa-cog fa-spin"/>
			</rendition.Box>)
		}
		const {
			tail, types
		} = this.props
		const {
			tailType, lenses, activeLens, activeSlice
		} = this.state
		const useFilters = Boolean(tailType) && tailType.slug !== 'view'
		const lens = _.find(lenses, {
			slug: activeLens
		}) || lenses[0]
		const slices = helpers.getViewSlices(head, types)
		const lensSupportsSlices = Boolean(lens) && Boolean(lens.data.supportsSlices)
		return (
			<rendition.Flex
				flex={this.props.flex}
				className={`column--${head ? head.slug || head.type : 'unknown'}`}
				flexDirection="column"
				style={{
					height: '100%', overflowY: 'auto', position: 'relative'
				}}
			>
				<If.If condition={Boolean(head)}>
					<rendition.Box>
						<rendition.Flex mt={3} justify="space-between">
							<rendition.Box flex="1" mx={3}>
								<If.If condition={useFilters}>
									<rendition.Box mt={0} flex="1 0 auto">
										<rendition.Filters
											schema={tailType.data.schema}
											filters={this.state.filters}
											onFiltersUpdate={this.updateFilters}
											onViewsUpdate={this.saveView}
											renderMode={[ 'add', 'search' ]}
										/>
									</rendition.Box>

								</If.If>
							</rendition.Box>

							<rendition.Flex mx={3}>
								<If.If condition={this.state.lenses.length > 1 && Boolean(lens)}>
									<ButtonGroup.default>
										{_.map(this.state.lenses, (item) => {
											return (
												<rendition.Button
													key={item.slug}
													bg={lens && lens.slug === item.slug ? '#333' : false}
													square={true}
													data-slug={item.slug}
													onClick={this.setLens}
												>
													<Icon.default name={item.data.icon}/>
												</rendition.Button>
											)
										})}
									</ButtonGroup.default>
								</If.If>
								{slices && slices.length > 0 && lensSupportsSlices &&
							<rendition.Box ml={3}>
											Slice by:
								<rendition.Select
									ml={2}
									value={activeSlice}
									onChange={lensSupportsSlices ? this.setSlice : _.noop}
								>
									{_.map(slices, (slice) => {
										return (<option key={slice.path} value={slice.path}>
											{slice.title}
										</option>)
									})}
								</rendition.Select>
							</rendition.Box>}
							</rendition.Flex>
						</rendition.Flex>

						<If.If condition={useFilters && this.state.filters.length > 0}>
							<rendition.Box flex="1 0 auto" mb={3} mx={3}>
								<rendition.Filters
									schema={tailType.data.schema}
									filters={this.state.filters}
									onFiltersUpdate={this.updateFilters}
									onViewsUpdate={this.saveView}
									renderMode={[ 'summary' ]}
								/>
							</rendition.Box>
						</If.If>
					</rendition.Box>
				</If.If>

				<rendition.Flex style={{
					height: '100%', minHeight: 0
				}}>
					<If.If condition={!tail}>
						<rendition.Box p={3}>
							<Icon.default name="cog fa-spin"/>
						</rendition.Box>
					</If.If>

					{Boolean(tail) && Boolean(lens) && (
						<lens.data.renderer
							channel={this.props.channel}
							tail={tail}
							setPage={this.setPage}
							page={this.state.options.page}
							type={tailType}
						/>
					)}
				</rendition.Flex>
			</rendition.Flex>
		)
	}
}
const mapStateToProps = (state, ownProps) => {
	const target = ownProps.channel.data.target
	return {
		channels: store.selectors.getChannels(state),
		tail: store.selectors.getViewData(state, target),
		types: store.selectors.getTypes(state),
		user: store.selectors.getCurrentUser(state)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
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
exports.default = lens
