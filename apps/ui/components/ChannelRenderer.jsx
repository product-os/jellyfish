/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	compose
} from 'redux'
import {
	DropTarget
} from 'react-dnd'
import {
	Alert,
	Box
} from 'rendition'
import ErrorBoundary from '@balena/jellyfish-ui-components/lib/shame/ErrorBoundary'
import Icon from '@balena/jellyfish-ui-components/lib/shame/Icon'
import LinkModal from './LinkModal'
import ChannelNotFound from './ChannelNotFound'
import {
	withTheme
} from 'styled-components'

// Selects an appropriate renderer for a card
class ChannelRenderer extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			showLinkModal: false,
			linkFrom: null
		}

		this.closeLinkModal = this.closeLinkModal.bind(this)
		this.link = this.link.bind(this)
	}

	closeLinkModal () {
		this.setState({
			showLinkModal: false
		})
	}

	link () {
		const fromCard = this.state.linkFrom
		const toCard = this.props.channel.data.head
		this.props.actions.createLink(fromCard, toCard)
		this.setState({
			showLinkModal: false,
			linkFrom: null
		})
	}

	displayLinkUI (from) {
		this.setState({
			showLinkModal: true,
			linkFrom: from
		})
	}

	render () {
		const {
			getLens,
			actions,
			channel,
			connectDropTarget,
			isOver,
			types,
			user,
			theme
		} = this.props

		const {
			head,
			error
		} = channel.data

		const {
			linkFrom,
			showLinkModal
		} = this.state

		const style = {
			position: 'absolute',
			width: _.get(this.props.space, [ 'width' ], 'auto'),
			left: _.get(this.props.space, [ 'left' ], 'auto'),
			height: '100%',
			transition: 'all ease-in-out 150ms',
			background: isOver ? theme.colors.background.light : theme.colors.background.main,
			borderLeft: `1px solid ${theme.colors.border.main}`,
			minWidth: 0,
			maxWidth: '100%',
			overflow: 'hidden'
		}

		if (!head) {
			if (error) {
				return (
					<Alert
						m={2}
						danger={true}
						style={style}
					>
						{error.toString()}
					</Alert>
				)
			}

			if (head === null) {
				return (
					<div style={style}>
						<ChannelNotFound channel={channel} />
					</div>
				)
			}

			return (
				<Box style={style}>
					<Box p={3}>
						<Icon spin name="cog"/>
					</Box>
				</Box>
			)
		}

		const lens = getLens(_.get(channel.data, [ 'format' ], 'full'), head, user)

		return (
			<ErrorBoundary style={style}>
				{
					connectDropTarget(
						<div style={style}>
							<lens.data.renderer card={head} level={0} {...this.props}/>
						</div>
					)
				}

				{showLinkModal && (
					<LinkModal
						actions={actions}
						target={head}
						card={linkFrom}
						types={types}
						onHide={this.closeLinkModal}
					/>
				)}
			</ErrorBoundary>
		)
	}
}

const target = {
	drop (props, monitor, component) {
		const fromCard = monitor.getItem()
		const toCard = props.channel.data.head

		// Make sure we don't link a card to itself
		if (fromCard.id === toCard.id) {
			return
		}

		component.displayLinkUI(monitor.getItem())
	}
}

const collect = (connector, monitor) => {
	return {
		connectDropTarget: connector.dropTarget(),
		isOver: monitor.isOver()
	}
}

export default compose(
	DropTarget('channel', target, collect),
	withTheme
)(ChannelRenderer)
