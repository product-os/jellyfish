/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import React from 'react'
import {
	connect
} from 'react-redux'
import ReactResizeObserver from 'react-resize-observer'
import {
	AutoSizer,
	List,
	CellMeasurer,
	CellMeasurerCache
} from 'react-virtualized'
import {
	bindActionCreators
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
} from '../core'
import BaseLens from './common/BaseLens'
import SingleCard from './SingleCard'
import Column from '../shame/Column'

class CardList extends BaseLens {
	constructor (props) {
		super(props)
		this.clearCellCache = () => {
			this.cache.clearAll()
		}
		this.rowRenderer = (rowProps) => {
			const {
				tail, channel: {
					data: {
						head
					}
				}
			} = this.props
			const card = tail[rowProps.index]

			// Don't show the card if its the head, this can happen on view types
			if (card.id === head.id) {
				return null
			}
			return (
				<CellMeasurer
					cache={this.cache}
					columnIndex={0}
					key={card.id}
					overscanRowCount={10}
					parent={rowProps.parent}
					rowIndex={rowProps.index}
				>
					{() => {
						return (
							<Box px={3} pb={3} style={rowProps.style}>
								<SingleCard.default.data.renderer card={card} level={1}/>
								<Divider color="#eee" m={0} style={{
									height: 1
								}}/>
							</Box>
						)
					}}
				</CellMeasurer>
			)
		}

		this.cache = new CellMeasurerCache({
			defaultHeight: 300,
			fixedWidth: true
		})
	}

	componentWillUpdate ({
		tail
	}) {
		// If tail data has changed, clear the cell cache
		if (!circularDeepEqual(this.props.tail, tail)) {
			this.clearCellCache()
		}
	}

	render () {
		const {
			tail
		} = this.props
		return (
			<Column flex="1" overflowY>
				<Box flex="1" style={{
					position: 'relative'
				}}>
					<ReactResizeObserver onResize={this.clearCellCache}/>
					{Boolean(tail) && tail.length > 0 && (
						<AutoSizer>
							{({
								width, height
							}) => {
								return (
									<List
										width={width}
										height={height}
										deferredMeasurementCache={this.cache}
										rowHeight={this.cache.rowHeight}
										rowRenderer={this.rowRenderer}
										rowCount={tail.length}
										onResize={this.clearCellCache}
										overscanRowCount={3}
									/>
								)
							}}
						</AutoSizer>
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
								borderTop: '1px solid #eee'
							}}
							justify="flex-end"
						>
							<Button
								success={true}
								className={`btn--add-${this.props.type.slug}`}
								onClick={this.openCreateChannel}
							>
								Add {this.props.type.name || this.props.type.slug}
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
		actions: {
			addChannel: bindActionCreators(actionCreators.addChannel, dispatch)
		}
	}
}

const lens = {
	slug: 'lens-list',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		renderer: connect(mapStateToProps, mapDispatchToProps)(CardList),
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
