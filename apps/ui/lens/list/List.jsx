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
import ReactResizeObserver from 'react-resize-observer'
import {
	AutoSizer,
	List,
	CellMeasurer,
	CellMeasurerCache,
	InfiniteLoader
} from 'react-virtualized'
import {
	bindActionCreators,
	compose
} from 'redux'
import {
	Flex,
	Button,
	Box,
	Txt,
	Divider
} from 'rendition'
import {
	actionCreators,
	selectors
} from '../../core'
import BaseLens from '../common/BaseLens'
import {
	getLens
} from '../'
import Column from '@balena/jellyfish-ui-components/lib/shame/Column'
import {
	withTheme
} from 'styled-components'

class CardList extends BaseLens {
	constructor (props) {
		super(props)

		this.state = {
			// eslint-disable-next-line no-undefined
			scrollToIndex: undefined
		}

		this.clearCellCache = () => {
			this.cache.clearAll()
		}

		this.loadMore = async () => {
			await this.props.setPage(this.props.page + 1)
		}

		this.isRowLoaded = ({
			index
		}) => {
			return Boolean(this.props.tail[index])
		}

		this.rowRenderer = (rowProps) => {
			const {
				tail, channel: {
					data: {
						head
					}
				},
				theme
			} = this.props
			const card = tail[rowProps.index]

			// Don't continue if the card doesn't exist
			if (!card) {
				return null
			}

			const lens = getLens('snippet', card, {})

			// Don't show the card if its the head, this can happen on view types
			if (card.id === head.id) {
				return null
			}

			return (
				<CellMeasurer
					key={rowProps.key}
					cache={this.cache}
					parent={rowProps.parent}
					columnIndex={0}
					rowIndex={rowProps.index}
				>
					<Box px={3} pb={3} style={rowProps.style}>
						<lens.data.renderer card={card}/>
						<Divider color={theme.colors.text.main} m={0} style={{
							height: 1
						}}/>
					</Box>
				</CellMeasurer>
			)
		}

		this.cache = new CellMeasurerCache({
			defaultHeight: 300,
			fixedWidth: true
		})
	}

	getSnapshotBeforeUpdate ({
		tail: prevTail
	}) {
		const nextTail = this.props.tail

		// Only clear CellCache if already rendered tail data has changed
		const previousTailDataChanged = !circularDeepEqual(prevTail, nextTail.slice(0, prevTail.length))
		if (previousTailDataChanged) {
			this.clearCellCache()
		}
		return previousTailDataChanged
	}

	componentDidUpdate ({
		tail: prevTail,
		pageOptions: {
			sortBy: previousSortBy
		}
	}, prevState, previousTailDataChanged) {
		const currentSortBy = this.props.pageOptions.sortBy

		// If sort-by value changes (such that the tail order also changes),
		// scroll to the top row and then immediately reset to undefined.
		// This is so we can scroll up again when/if the sort-by changes again
		if (previousSortBy !== currentSortBy && previousTailDataChanged) {
			this.setState({
				scrollToIndex: 0
			}, () => {
				this.setState({
					// eslint-disable-next-line no-undefined
					scrollToIndex: undefined
				})
			})
		}
	}

	render () {
		const {
			tail,
			pageOptions,
			totalPages,
			type,
			theme
		} = this.props

		// TODO: remove this logic when totalPage returns a usefull number
		// We can't get the totalPage of a schema.
		// Until then we should assume we want atleast 1 page more than our current page.
		const rowCount = (totalPages === Infinity) ? (tail.length + pageOptions.limit) : totalPages

		// Passing sortBy to the list ensures that it re-renders on sort, since
		// by default all react-virtualized components use shallowCompare (https://github.com/bvaughn/react-virtualized/blob/master/README.md#pass-thru-props)
		const sortBy = _.last(pageOptions.sortBy)

		return (
			<Column flex="1" overflowY>
				<Box flex="1" style={{
					position: 'relative'
				}}>
					<ReactResizeObserver onResize={this.clearCellCache}/>
					{Boolean(tail) && tail.length > 0 && (
						<InfiniteLoader
							loadMoreRows={this.loadMore}
							rowCount={rowCount}
							isRowLoaded={this.isRowLoaded}
						>
							{({
								onRowsRendered, registerChild
							}) => (
								<AutoSizer>
									{({
										width, height
									}) => {
										return (
											<List
												width={width}
												height={height}
												onRowsRendered={onRowsRendered}
												ref={registerChild}
												rowCount={tail.length}
												deferredMeasurementCache={this.cache}
												overscanRowCount={3}
												rowHeight={this.cache.rowHeight}
												rowRenderer={this.rowRenderer}
												sortBy={sortBy}
												scrollToIndex={this.state.scrollToIndex}
											/>
										)
									}}
								</AutoSizer>
							)}
						</InfiniteLoader>
					)}

					{Boolean(tail) && tail.length === 0 && (
						<Txt.p p={3}>No results found</Txt.p>
					)}
				</Box>

				{Boolean(this.props.type) && (
					<React.Fragment>
						<Flex
							p={3}
							style={{
								borderTop: `1px solid ${theme.colors.background.dark}`
							}}
							justifyContent="flex-end"
						>
							<Button
								success={true}
								className={`btn--add-${type.slug}`}
								onClick={this.openCreateChannel}
							>
								Add {type.name || type.slug}
							</Button>
						</Flex>
					</React.Fragment>
				)}
			</Column>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addChannel'
			]), dispatch)
	}
}

const lens = {
	slug: 'lens-list',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		format: 'list',
		renderer: compose(
			withTheme,
			connect(mapStateToProps, mapDispatchToProps)
		)(CardList),
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				}
			}
		}
	}
}

export default lens
