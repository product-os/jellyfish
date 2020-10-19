/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import * as _ from 'lodash'
import * as React from 'react'
import {
	Box
} from 'rendition'
import Column from '@balena/jellyfish-ui-components/lib/shame/Column'
import Icon from '@balena/jellyfish-ui-components/lib/shame/Icon'
import CardChatSummary from '@balena/jellyfish-ui-components/lib/CardChatSummary'
import * as helpers from '@balena/jellyfish-ui-components/lib/services/helpers'

export const SLUG = 'lens-simple-list'

export default class SimpleList extends React.Component {
	constructor (props) {
		super(props)

		this.bindScrollArea = this.bindScrollArea.bind(this)
		this.handleScroll = this.handleScroll.bind(this)
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	async handleScroll () {
		const {
			scrollArea, loadingPage
		} = this
		if (!scrollArea) {
			return
		}
		this.scrollBottomOffset = scrollArea.scrollHeight - (scrollArea.scrollTop + scrollArea.offsetHeight)
		if (loadingPage) {
			return
		}
		if (this.scrollBottomOffset > 200) {
			return
		}
		this.loadingPage = true
		await this.props.setPage(this.props.page + 1)
		this.loadingPage = false
	}

	bindScrollArea (ref) {
		this.scrollArea = ref
	}

	render () {
		const {
			lensSlug,
			channel,
			channels,
			page,
			totalPages
		} = this.props
		const threadTargets = _.map(channels, 'data.target')
		const tail = _.sortBy(this.props.tail, 'updated_at')
		tail.reverse()

		return (
			<Column data-test={`lens--${lensSlug}`}>
				<div
					ref={this.bindScrollArea}
					onScroll={this.handleScroll}
					style={{
						height: '100%',
						paddingBottom: 16,
						overflowY: 'auto'
					}}
				>
					{!(totalPages > page + 1) && tail.length === 0 && (
						<Box p={3}><strong>No results found</strong></Box>
					)}

					{_.map(tail, (card) => {
						const timeline = _.sortBy(
							_.get(card.links, [ 'has attached element' ], []),
							'data.timestamp'
						)

						return (
							<CardChatSummary
								getActor={this.props.actions.getActor}
								key={card.id}
								active={_.includes(threadTargets, card.slug) || _.includes(threadTargets, card.id)}
								card={card}
								timeline={timeline}
								to={helpers.appendToChannelPath(channel, card)}
							/>
						)
					})}

					{totalPages > page + 1 && (
						<Box p={3}>
							<Icon spin name="cog"/>
						</Box>
					)}
				</div>
			</Column>
		)
	}
}
