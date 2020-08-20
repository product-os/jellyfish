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
import {
	bindActionCreators
} from 'redux'
import {
	Flex,
	Button,
	Box,
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
import Icon from '@balena/jellyfish-ui-components/lib/shame/Icon'
import {
	InfiniteList
} from '@balena/jellyfish-ui-components/lib/InfiniteList'

const Row = (props) => {
	const {
		head,
		card
	} = props

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
		<Box key={card.id} px={3} pb={3}>
			<lens.data.renderer card={card}/>
			<Divider color="#eee" m={0} style={{
				height: 1
			}}/>
		</Box>
	)
}

class CardList extends BaseLens {
	constructor (props) {
		super(props)
		this.handleScrollEnding = async () => {
			await this.props.setPage(this.props.page + 1)
		}

		this.isRowLoaded = ({
			index
		}) => {
			return Boolean(this.props.tail[index])
		}
	}

	componentWillUpdate ({
		tail
	}) {
		const nextTail = tail
		const prevTail = this.props.tail

		// Only clear CellCache if already rendered tail data has changed
		const isPreviousTailDataChanged = !circularDeepEqual(prevTail, nextTail.slice(0, prevTail.length))
		if (isPreviousTailDataChanged) {
			// This.clearCellCache()
		}
	}

	render () {
		const {
			tail,
			totalPages,
			page,
			type,
			channel: {
				data: {
					head
				}
			}
		} = this.props

		const typeName = type.name || type.slug

		return (
			<Column>
				<InfiniteList
					key={this.props.channel.id}
					onScrollEnding={this.handleScrollEnding}
					style={{
						height: '100%',
						paddingBottom: 16
					}}
				>
					{!(totalPages > page + 1) && Boolean(tail) && tail.length === 0 && (
						<Box p={3}>
							<strong>
								No {typeName}&apos;s found
							</strong>
						</Box>
					)}

					{Boolean(tail) && tail.length > 0 && _.map(tail, (card) => {
						return <Row key={card.id} card={card} head={head} />
					})}

					{totalPages > page + 1 && (
						<Box p={3}>
							<Icon spin name="cog"/>
						</Box>
					)}
				</InfiniteList>

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
								Add {typeName}
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
