/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import _ from 'lodash'
import React from 'react'
import {
	Box,
	Button,
	Divider,
	Flex,
	Heading,
	Search,
	Tab,
	Tabs,
	Txt
} from 'rendition'
import styled from 'styled-components'
import Segment from '../SingleCard/Segment'
import CardFields from '../../../../../lib/ui-components/shame/CardFields'
import Icon from '../../../../../lib/ui-components/shame/Icon'
import CardLayout from '../../../layouts/CardLayout'
import {
	getContextualThreadsQuery,
	getLensBySlug
} from '../../'
import {
	colorHash,
	createFullTextSearchFilter,
	getType
} from '../../../../../lib/ui-components/services/helpers'

const SingleCardTabs = styled(Tabs) `
	flex: 1

	> [role="tabpanel"] {
		flex: 1
	}
`

const LIMIT = 30

export default class RepositoryFull extends React.Component {
	constructor (props) {
		super(props)

		const tail = _.get(this.props.card.links, [ 'has attached element' ], [])

		const comms = _.filter(tail, (item) => {
			const typeBase = item.type.split('@')[0]
			return typeBase === 'message' || typeBase === 'whisper'
		})

		this.state = {
			activeIndex: comms.length ? 1 : 0,
			expanded: false,
			options: {
				page: 0,
				totalPages: Infinity
			},
			searchTerm: '',
			relationship: {
				target: this.props.card,
				name: 'is of'
			}
		}

		const messageType = getType('message', this.props.types)
		this.eventSchema = messageType.data.schema

		this.setActiveIndex = this.setActiveIndex.bind(this)
		this.setPage = this.setPage.bind(this)
		this.onSearchTermChange = this.onSearchTermChange.bind(this)
		this.refreshQuery = _.debounce(this.refreshQuery, 350)
		this.isLoadingPage = false
	}

	async loadThreadData (page, searchTerm = '') {
		const query = getContextualThreadsQuery(this.props.card.id)
		if (searchTerm) {
			const searchQuery = createFullTextSearchFilter(this.eventSchema, searchTerm)
			query.anyOf = (query.anyOf || []).concat(searchQuery.anyOf)
		}
		const options = {
			viewId: this.props.card.id,
			page,
			limit: LIMIT,
			sortBy: 'created_at',
			sortDir: 'desc'
		}

		return this.props.actions.loadViewResults(query, options)
			.then((results) => {
				if (results.length < LIMIT) {
					this.setState((state) => {
						return {
							options: {
								...state.options,
								totalPages: state.options.page + 1
							}
						}
					})
				}
			})
	}

	shouldComponentUpdate (nextProps, nextState) {
		return	!circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	componentDidMount () {
		// Trigger a query and stream for this cards contextual thread messages.
		// They will be attached using redux as the `messages` prop
		const query = getContextualThreadsQuery(this.props.card.id)
		this.loadThreadData(this.state.options.page, this.state.searchTerm)
		this.props.actions.streamView(query, {
			viewId: this.props.card.id
		})
	}

	setActiveIndex (activeIndex) {
		this.setState({
			activeIndex
		})
	}

	async setPage (page) {
		if (this.isLoadingPage) {
			return
		}

		if (page + 1 >= this.state.options.totalPages) {
			return
		}

		this.isLoadingPage = true

		const options = Object.assign({}, this.state.options, {
			page
		})

		await this.loadThreadData(options.page, this.state.searchTerm)

		this.setState({
			options
		})

		this.isLoadingPage = false
	}

	onSearchTermChange (event) {
		this.setState({
			searchTerm: event.target.value
		}, () => {
			this.refreshQuery()
		})
	}

	refreshQuery () {
		this.loadThreadData(this.state.options.page, this.state.searchTerm)
	}

	componentWillUnmount () {
		// Clean up store data on unmount
		const query = getContextualThreadsQuery(this.props.card.id)
		this.props.actions.clearViewData(query, {
			viewId: this.props.card.id
		})
	}

	render () {
		const {
			actions,
			card,
			channel,
			fieldOrder,
			types
		} = this.props
		const {
			searchTerm,
			expanded
		} = this.state
		const type = _.find(types, {
			slug: card.type.split('@')[0]
		})

		const relationships = _.get(type, [ 'data', 'meta', 'relationships' ])
		const messages = _.sortBy(this.props.messages, 'created_at')

		const Interleaved = getLensBySlug('lens-interleaved').data.renderer

		return (
			<CardLayout
				overflowY
				card={card}
				channel={channel}
				inlineActionItems={(
					<Box mr={3} data-test="repository__search">
						<Search
							value={searchTerm}
							onChange={this.onSearchTermChange}
							placeholder="Search..."
						/>
					</Box>
				)}
				title={
					<Flex>
						<Button
							plain
							mr={3}
							icon={<Icon name={`chevron-${expanded ? 'up' : 'down'}`} />}
							onClick={() => this.setState({
								expanded: !expanded
							})}
						/>
						<Box>
							<Heading.h4>
								{card.name || card.slug || card.type}
							</Heading.h4>

							<Txt color="text.light" fontSize="0">Repository</Txt>
						</Box>
					</Flex>
				}
			>
				<Divider mb={0} width="100%" color={colorHash(card.type)} />

				{expanded && (
					<SingleCardTabs
						activeIndex={this.state.activeIndex}
						onActive={this.setActiveIndex}
					>
						<Tab title="Info">
							<Box p={3}>
								<CardFields
									card={card}
									fieldOrder={fieldOrder}
									type={type}
								/>
							</Box>
						</Tab>

						{_.map(relationships, (segment) => {
							return (
								<Tab title={segment.title} key={segment.title}>
									<Segment
										card={card}
										segment={segment}
										types={types}
										actions={actions}
									/>
								</Tab>
							)
						})}
					</SingleCardTabs>
				)}

				<Box
					style={{
						overflow: 'auto'
					}}
					flex={1}
				>
					<Interleaved
						channel={channel}
						tail={messages}
						relationship={this.state.relationship}
						setPage={this.setPage}
						page={this.state.options.page}
						totalPages={this.state.options.totalPages}
					/>
				</Box>
			</CardLayout>
		)
	}
}
