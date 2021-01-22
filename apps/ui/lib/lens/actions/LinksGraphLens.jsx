/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as d3 from 'd3'
import * as _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import * as redux from 'redux'
import {
	CloseButton,
	Column,
	helpers
} from '@balena/jellyfish-ui-components'
import {
	actionCreators,
	sdk
} from '../../core'
import ReactResizeObserver from 'react-resize-observer'

class CreateLens extends React.Component {
	constructor (props) {
		super(props)

		const {
			card
		} = this.props.channel.data.head

		this.graph = {
			nodes: [ card ],
			links: []
		}

		this.loadNodeLinks(card)

		this.close = this.close.bind(this)
		this.bindCanvas = this.bindCanvas.bind(this)
		this.resizeCanvas = this.resizeCanvas.bind(this)
	}

	async loadNodeLinks (card) {
		_.map(card.links, async (linkedCards, verb) => {
			for (const item of linkedCards) {
				if (
					_.find(this.graph.nodes, {
						id: item.id
					})
				) {
					continue
				}

				const fullCard = await sdk.card.get(item.id, {
					type: item.type
				})

				this.graph.nodes.push(fullCard)

				this.graph.links.push({
					source: card.id,
					target: fullCard.id
				})

				this.simulation
					.nodes(this.graph.nodes)

				this.simulation
					.force('link')
					.links(this.graph.links)

				await this.loadNodeLinks(fullCard)
			}
		})
	}

	componentDidMount () {
		const cardId = this.props.channel.data.head.card.id
		let active = false
		const graph = this.graph
		const canvas = this.$canvas
		const context = canvas.getContext('2d')

		this.simulation = d3.forceSimulation()
			.force('link', d3.forceLink().id((node) => {
				return node.id
			}))
			.force('charge', d3.forceManyBody())

		const simulation = this.simulation

		this.resizeCanvas()

		const ticked = () => {
			context.clearRect(0, 0, canvas.width, canvas.height)

			context.beginPath()
			graph.links.forEach(drawLink)
			context.strokeStyle = '#aaa'
			context.stroke()

			graph.nodes.forEach(drawNode)

			if (active) {
				context.fillStyle = 'black'
				context.font = '14px monospace'
				context.fillText(active.name || active.type, active.x + 5, active.y + 2)
			}
		}

		const dragsubject = (event) => {
			return simulation.find(event.x, event.y)
		}

		const dragstarted = (event) => {
			if (!event.active) {
				simulation.alphaTarget(0.3).restart()
			}
			event.subject.fx = event.subject.x
			event.subject.fy = event.subject.y

			active = event.subject
		}

		const dragged = (event) => {
			event.subject.fx = event.x
			event.subject.fy = event.y
		}

		const dragended = (event) => {
			if (!event.active) {
				simulation.alphaTarget(0)
			}
			event.subject.fx = null
			event.subject.fy = null

			active = null
		}

		const drawLink = (linkItem) => {
			context.moveTo(linkItem.source.x, linkItem.source.y)
			context.lineTo(linkItem.target.x, linkItem.target.y)
		}

		const drawNode = (node) => {
			const radius = node.id === cardId ? 6 : 2
			const color = node.id === cardId ? '#2297DE' : helpers.colorHash(node.type)
			context.beginPath()
			context.moveTo(node.x + radius, node.y)
			context.arc(node.x, node.y, radius, 0, 2 * Math.PI)
			context.fillStyle = color
			context.fill()
			context.strokeStyle = color
			context.stroke()
		}

		simulation
			.nodes(graph.nodes)
			.on('tick', ticked)

		simulation.force('link')
			.links(graph.links)

		// eslint-disable-next-line prefer-reflect
		d3.select(canvas)
			.call(d3.drag()
				.container(canvas)
				.subject(dragsubject)
				.on('start', dragstarted)
				.on('drag', dragged)
				.on('end', dragended))
	}

	resizeCanvas () {
		const pixelRatio = 1
		const canvas = this.$canvas

		if (!canvas) {
			return
		}

		const bounds = canvas.getBoundingClientRect()
		const width = bounds.width
		const height = bounds.height

		canvas.width = width * pixelRatio
		canvas.height = height * pixelRatio

		this.simulation.force('center', d3.forceCenter(canvas.width / 2, canvas.height / 2))
	}

	close () {
		this.props.actions.removeChannel(this.props.channel)
	}

	bindCanvas (elem) {
		this.$canvas = elem
	}

	render () {
		const {
			channel
		} = this.props

		return (
			<Column>
				<ReactResizeObserver onResize={this.resizeCanvas}/>
				<CloseButton
					style={{
						position: 'absolute',
						top: 8,
						right: 8
					}}
					onClick={this.close}
					channel={channel}
				/>
				<canvas
					ref={this.bindCanvas}
					style={{
						width: '100%',
						height: '100%'
					}}
				/>
			</Column>
		)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: {
			removeChannel: redux.bindActionCreators(actionCreators.removeChannel, dispatch)
		}
	}
}

export default {
	slug: 'lens-action-create',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		format: 'visualizeLinks',
		renderer: connect(null, mapDispatchToProps)(CreateLens),
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'object'
		}
	}
}
