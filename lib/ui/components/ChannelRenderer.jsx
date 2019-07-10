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
	Box
} from 'rendition'
import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import styled from 'styled-components'
import ErrorBoundary from '../shame/ErrorBoundary'
import Icon from '../shame/Icon'
import LinkModal from './LinkModal'
import {
	actionCreators,
	selectors
} from '../core'
import {
	getLens
} from '../lens'

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
			channel,
			connectDropTarget,
			isOver,
			types,
			user
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
			background: isOver ? '#ccc' : 'white',
			borderLeft: '1px solid #eee',
			minWidth: 0
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

		const lens = getLens('full', head, user)

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
						target={head}
						card={linkFrom}
						types={types}
						show={showLinkModal}
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

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: {
			createLink: bindActionCreators(actionCreators.createLink, dispatch)
		}
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(
	DropTarget('channel', target, collect)(ChannelRenderer)
)
