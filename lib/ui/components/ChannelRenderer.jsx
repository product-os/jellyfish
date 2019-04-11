/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const React = require('react')
const reactDnd = require('react-dnd')
const rendition = require('rendition')
const styled = require('styled-components').default
const constants = require('../constants')
const link = require('../services/link')
const ErrorBoundary = require('../shame/ErrorBoundary')
const Icon = require('../shame/Icon').default

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

// Load lens service
const lensService = require('../lens')

// Selects an appropriate renderer for a card
class ChannelRenderer extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			showLinkModal: false,
			linkFrom: null
		}
	}
	link () {
		const fromCard = this.state.linkFrom
		const toCard = this.props.channel.data.head
		const linkName = _.get(constants.LINKS, [ fromCard.type, toCard.type ], 'is attached to')

		link.createLink(fromCard, toCard, linkName)
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
					<rendition.Alert
						m={2}
						danger={true}
						style={style}
					>
						{channel.data.error.toString()}
					</rendition.Alert>
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
				<rendition.Box
					style={style}
				>
					<rendition.Box p={3}>
						<Icon spin name="cog"/>
					</rendition.Box>
				</rendition.Box>
			)
		}

		const lens = lensService.default.getLens(channel.data.head, this.props.user)

		return (
			<ErrorBoundary.ErrorBoundary style={style}>
				{
					connectDropTarget(
						<div style={style}>
							<lens.data.renderer card={channel.data.head} level={0} {...this.props}/>
						</div>
					)
				}

				{this.state.showLinkModal && (
					<rendition.Modal
						cancel={() => {
							return this.setState({
								showLinkModal: false
							})
						}}
						done={() => {
							return this.link()
						}}
					>
						Link {this.state.linkFrom.type} <strong>{this.state.linkFrom.name}</strong> to{' '}
						{this.props.channel.data.head.type} <strong>{this.props.channel.data.head.name}</strong>
					</rendition.Modal>
				)}
			</ErrorBoundary.ErrorBoundary>
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

const collect = (connect, monitor) => {
	return {
		connectDropTarget: connect.dropTarget(),
		isOver: monitor.isOver()
	}
}

exports.default = reactDnd.DropTarget('channel', target, collect)(ChannelRenderer)
