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
} from '../../core'
import BaseLens from '../common/BaseLens'
import {
	getLens
} from '../'
import Column from '../../shame/Column'

class CardList extends BaseLens {
	constructor (props) {
		super(props)
		this.clearCellCache = () => {
			this.cache.clearAll()
		}
		this.rowRenderer = (rowProps) => {
			const {
				tail
			} = this.props
			const card = tail[rowProps.index]

			const lens = getLens('snippet', card, {})

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
								<lens.data.renderer card={card}/>
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
			tail,
			types
		} = this.props

		const type = _.find(types, {
			slug: _.get(_.first(tail), [ 'type' ])
		})

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

				{Boolean(type) && (
					<React.Fragment>
						<Flex
							p={3}
							style={{
								borderTop: '1px solid #eee'
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
		user: selectors.getCurrentUser(state),
		types: selectors.getTypes(state)
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
