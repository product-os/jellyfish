/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	DropTarget
} from 'react-dnd'
import {
	Alert,
	Box,
	Modal
} from 'rendition'
import styled from 'styled-components'
import constants from '../constants'
import {
	ErrorBoundary
} from '../shame/ErrorBoundary'
import Icon from '../shame/Icon'
import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	actionCreators
} from '../core'
import lensService from '../lens'

const ErrorNotFound = styled.h1 `
	color: white;
	background: url(/icons/jellyfish.svg) repeat;
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	font-size: 200px;
	background-size: 14px;
	margin: 10% auto;
	background-color: #c5edff;
`

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
		const linkName = _.get(constants.LINKS, [ fromCard.type, toCard.type ], 'is attached to')

		this.props.actions.createLink(fromCard, toCard, linkName)
		this.setState({
			showLinkModal: false,
			linkFrom: null
		})
	}

	render () {
		const {
			channel,
			connectDropTarget,
			isOver
		} = this.props

		const style = {
			position: 'absolute',
			width: _.get(this.props.space, [ 'width' ], 'auto'),
			left: _.get(this.props.space, [ 'left' ], 'auto'),
			height: '100%',
			transition: 'all ease-in-out 150ms',
			background: isOver ? '#ccc' : 'white',
			borderLeft: '1px solid #eee',
			minWidth: 0
		}

		if (!channel.data.head) {
			if (channel.data.error) {
				return (
					<Alert
						m={2}
						danger={true}
						style={style}
					>
						{channel.data.error.toString()}
					</Alert>
				)
			}

			if (channel.data.head === null) {
				return (
					<ErrorNotFound>
						404
					</ErrorNotFound>
				)
			}

			return (
				<Box
					style={style}
				>
					<Box p={3}>
						<Icon spin name="cog"/>
					</Box>
				</Box>
			)
		}

		const lens = lensService.default.getLens(channel.data.head, this.props.user)

		return (
			<ErrorBoundary style={style}>
				{
					connectDropTarget(
						<div style={style}>
							<lens.data.renderer card={channel.data.head} level={0} {...this.props}/>
						</div>
					)
				}

				{this.state.showLinkModal && (
					<Modal
						cancel={this.closeLinkModal}
						done={this.link}
					>
						Link {this.state.linkFrom.type} <strong>{this.state.linkFrom.name}</strong> to{' '}
						{this.props.channel.data.head.type} <strong>{this.props.channel.data.head.name}</strong>
					</Modal>
				)}
			</ErrorBoundary>
		)
	}
}

const target = {
	drop (props, monitor, component) {
		console.log({
			props,
			monitor,
			component
		})
		const fromCard = monitor.getItem()
		const toCard = props.channel.data.head

		// Make sure we don't link a card to itself
		if (fromCard.id === toCard.id) {
			return
		}

		component.setState({
			showLinkModal: true,
			linkFrom: monitor.getItem()
		})
	}
}

const collect = (connector, monitor) => {
	return {
		connectDropTarget: connector.dropTarget(),
		isOver: monitor.isOver()
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: {
			createLink: bindActionCreators(actionCreators.createLink, dispatch)
		}
	}
}

export default DropTarget('channel', target, collect)(
	connect(null, mapDispatchToProps)(ChannelRenderer)
)
