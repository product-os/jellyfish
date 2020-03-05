/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	DragSource
} from 'react-dnd'
import {
	Button
} from 'rendition'
import {
	constraints as LINKS
} from '../../sdk/link-constraints'
import ContextMenu from '../ContextMenu'
import LinkModal from '../LinkModal'
import Icon from '../shame/Icon'

class CardLinker extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			showMenu: false,
			showLinkModal: false
		}

		this.openLinkModal = this.openLinkModal.bind(this)
		this.hideLinkModal = this.hideLinkModal.bind(this)
		this.toggleMenu = this.toggleMenu.bind(this)
		this.openCreateChannel = this.openCreateChannel.bind(this)
		this.openVisualizeChannel = this.openVisualizeChannel.bind(this)
	}

	openLinkModal () {
		this.setState({
			showLinkModal: true,
			showMenu: false
		})
	}

	hideLinkModal () {
		this.setState({
			showLinkModal: false,
			showMenu: false
		})
	}

	toggleMenu () {
		this.setState({
			showMenu: !this.state.showMenu
		})
	}

	openCreateChannel () {
		this.props.actions.addChannel({
			head: {
				action: 'create',
				seed: {
					markers: this.props.card.markers
				},
				onDone: {
					action: 'link',
					target: this.props.card
				}
			},
			canonical: false
		})
	}

	openVisualizeChannel () {
		this.props.actions.addChannel({
			head: {
				action: 'visualize-links',
				card: this.props.card
			},
			canonical: false
		})
	}

	getAvailableTypes () {
		const {
			card,
			types
		} = this.props

		const availableTypes = types.filter((type) => {
			return _.find(LINKS, {
				data: {
					from: card.type.split('@')[0]
				}
			})
		})

		return availableTypes
	}

	render () {
		const {
			card,
			connectDragSource,
			types
		} = this.props
		const {
			showLinkModal
		} = this.state

		const type = card.type.split('@')[0]

		if (!_.some(LINKS, [ 'data.from', card.type ]) &&
			!_.some(LINKS, [ 'data.from', type ])) {
			return null
		}
		const typeCard = _.find(types, [ 'slug', card.type ]) ||
			_.find(types, [ 'slug', type ])
		const typeName = typeCard ? typeCard.name : type

		return connectDragSource(
			<div>
				<span>
					<Button
						data-test="card-linker-action"
						plain
						onClick={this.toggleMenu}
						mr={2}
						tooltip={{
							placement: 'left',
							text: `Link this ${typeName} to another element`
						}}
					>
						<Icon name="bezier-curve"/>
					</Button>

					{this.state.showMenu && (
						<ContextMenu
							position="bottom"
							onClose={this.toggleMenu}
						>
							<Button
								style={{
									display: 'block'
								}}
								mb={2}
								plain
								onClick={this.openLinkModal}
								data-test="card-linker-action--existing"
							>
								Link to existing element
							</Button>

							<Button
								style={{
									display: 'block'
								}}
								mb={2}
								plain
								onClick={this.openCreateChannel}
								data-test="card-linker-action--new"
							>
								Create a new element to link to
							</Button>

							<Button
								style={{
									display: 'block'
								}}
								plain
								onClick={this.openVisualizeChannel}
								data-test="card-linker-action--visualize"
							>
								Visualize links
							</Button>
						</ContextMenu>
					)}
				</span>

				<LinkModal
					card={card}
					types={types}
					show={showLinkModal}
					onHide={this.hideLinkModal}
				/>
			</div>
		)
	}
}

const collect = (connector, monitor) => {
	return {
		connectDragSource: connector.dragSource(),
		isDragging: monitor.isDragging()
	}
}

const cardSource = {
	beginDrag (props) {
		return props.card
	}
}

export default DragSource('channel', cardSource, collect)(CardLinker)
