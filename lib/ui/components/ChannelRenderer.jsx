/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const React = require('react')
const reactDnd = require('react-dnd')
const rendition = require('rendition')
const constants = require('../constants')
const link = require('../services/link')
const ErrorBoundary = require('../shame/ErrorBoundary')

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
			channel, connectDropTarget, isOver
		} = this.props
		if (!channel.data.head) {
			if (channel.data.error) {
				return <rendition.Alert m={2} danger={true}>{channel.data.error.toString()}</rendition.Alert>
			}
			return (<rendition.Box flex="1">
				<rendition.Box p={3}>
					<i className="fas fa-cog fa-spin"/>
				</rendition.Box>
			</rendition.Box>)
		}
		const lens = lensService.default.getLens(channel.data.head)
		return (<ErrorBoundary.ErrorBoundary>
			{connectDropTarget(<div style={{
				flex: this.props.flex,
				background: isOver ? '#ccc' : 'none',
				borderLeft: '1px solid #eee',
				minWidth: 0
			}}>
				<lens.data.renderer card={channel.data.head} level={0} {...this.props}/>
			</div>)}

			{this.state.showLinkModal && (<rendition.Modal cancel={() => {
				return this.setState({
					showLinkModal: false
				})
			}} done={() => { return this.link() }}>
				Link {this.state.linkFrom.type} <strong>{this.state.linkFrom.name}</strong> to
				{this.props.channel.data.head.type} <strong>{this.props.channel.data.head.name}</strong>
			</rendition.Modal>)}
		</ErrorBoundary.ErrorBoundary>)
	}
}
const squareTarget = {
	drop (_props, monitor, component) {
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
exports.default = reactDnd.DropTarget('channel', squareTarget, collect)(ChannelRenderer)
