/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const React = require('react')
const reactDnd = require('react-dnd')
const Async = require('react-select/lib/Async')
const {
	connect
} = require('react-redux')
const redux = require('redux')
const rendition = require('rendition')
const constants = require('../constants')
const {
	actionCreators,
	sdk
} = require('../core')
const helpers = require('../services/helpers')
const link = require('../services/link')
const ContextMenu = require('./ContextMenu')
const Icon = require('../shame/Icon')
const IconButton = require('../shame/IconButton')
class CardLinker extends React.Component {
	constructor (props) {
		super(props)
		this.openLinkModal = () => {
			this.setState({
				showLinkModal: true,
				showMenu: false
			})
		}
		this.hideLinkModal = () => {
			this.setState({
				showLinkModal: false,
				showMenu: false
			})
		}
		this.getLinkTargets = async (value) => {
			const {
				selectedTypeTarget
			} = this.state
			if (!selectedTypeTarget || !value) {
				return []
			}
			const filter = helpers.createFullTextSearchFilter(selectedTypeTarget.data.schema, value)
			_.set(filter, [ 'properties', 'type' ], {
				type: 'string',
				const: selectedTypeTarget.slug
			})
			const results = await sdk.query(filter)
			this.setState({
				results
			})
			return results.map((card) => {
				return {
					label: card.name || card.slug || card.id,
					value: card.id
				}
			})
		}
		this.handleTypeTargetSelect = (event) => {
			this.setState({
				selectedTypeTarget: _.find(this.props.types, {
					slug: event.target.value
				})
			})
		}
		this.handleTargetSelect = (target) => {
			this.setState({
				selectedTarget: _.find(this.state.results, {
					id: target.value
				}) || null
			})
		}
		this.linkToExisting = async () => {
			const {
				card
			} = this.props
			const {
				selectedTypeTarget,
				selectedTarget
			} = this.state
			if (!selectedTypeTarget || !selectedTarget) {
				return
			}
			const linkName = constants.LINKS[card.type][selectedTypeTarget.slug]
			link.createLink(this.props.card, selectedTarget, linkName)
			this.setState({
				showLinkModal: false,
				selectedTarget: null
			})
		}

		this.toggleMenu = () => {
			this.setState({
				showMenu: !this.state.showMenu
			})
		}

		const {
			card, types
		} = props

		this.state = {
			showMenu: false,
			showLinkModal: false,
			results: [],
			selectedTarget: null,
			selectedTypeTarget: _.find(types, {
				slug: _.first(_.keys(constants.LINKS[card.type]))
			}) || null
		}

		this.openCreateChannel = () => {
			this.props.actions.addChannel({
				head: {
					action: 'create',
					types: this.getAvailableTypes(),
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

		this.openVisualizeChannel = () => {
			this.props.actions.addChannel({
				head: {
					action: 'visualize-links',
					card: this.props.card
				},
				canonical: false
			})
		}
	}

	getAvailableTypes () {
		const {
			card,
			types
		} = this.props

		const availableTypes = types.filter((type) => {
			return constants.LINKS[card.type] && constants.LINKS[card.type].hasOwnProperty(type.slug)
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
			showLinkModal, selectedTarget, selectedTypeTarget
		} = this.state
		const availableTypes = this.getAvailableTypes()
		const linkTypeTargets = availableTypes.map((item) => {
			return {
				value: item.slug,
				label: item.name || item.slug
			}
		})
		if (!constants.LINKS[card.type]) {
			return null
		}
		const typeCard = _.find(types, [ 'slug', card.type ])
		const typeName = typeCard ? typeCard.name : card.type
		const selectTargetValue = selectedTarget ? {
			value: selectedTarget.id,
			label: selectedTarget.name || selectedTarget.slug
		} : null

		return connectDragSource(
			<div>
				<span>
					<IconButton.IconButton
						data-test="card-linker-action"
						plaintext
						square={true}
						onClick={this.toggleMenu}
						tooltip={{
							placement: 'left',
							text: `Link this ${typeName} to another element`
						}}
					>
						<Icon.default name="bezier-curve"/>
					</IconButton.IconButton>

					{this.state.showMenu && (
						<ContextMenu.ContextMenu
							position="bottom"
							onClose={this.toggleMenu}
						>
							<rendition.Button
								style={{
									display: 'block'
								}}
								mb={2}
								plaintext
								onClick={this.openLinkModal}
								data-test="card-linker-action--existing"
							>
								Link to existing element
							</rendition.Button>

							<rendition.Button
								style={{
									display: 'block'
								}}
								mb={2}
								plaintext
								onClick={this.openCreateChannel}
								data-test="card-linker-action--new"
							>
								Create a new element to link to
							</rendition.Button>

							<rendition.Button
								style={{
									display: 'block'
								}}
								plaintext
								onClick={this.openVisualizeChannel}
								data-test="card-linker-action--visualize"
							>
								Visualize links
							</rendition.Button>
						</ContextMenu.ContextMenu>
					)}
				</span>

				{showLinkModal && (
					<rendition.Modal
						title={`Link this ${typeName} to another element`}
						cancel={this.hideLinkModal}
						primaryButtonProps={{
							disabled: !selectedTypeTarget,
							'data-test': 'card-linker--existing__submit'
						}}
						done={this.linkToExisting}
					>
						<rendition.Flex align="center">
							<rendition.Txt>
								Link this {typeName} to{' '}
								{linkTypeTargets.length === 1 && (linkTypeTargets[0].label || linkTypeTargets[0].value)}
							</rendition.Txt>
							{linkTypeTargets.length > 1 && (
								<rendition.Select ml={2}
									value={selectedTypeTarget ? selectedTypeTarget.slug : null}
									onChange={this.handleTypeTargetSelect}
								>
									{linkTypeTargets.map((type) => {
										return <option value={type.value} key={type.value}>{type.label || type.value}</option>
									})}
								</rendition.Select>
							)}
							<rendition.Box
								flex="1"
								ml={2}
								data-test="card-linker--existing__input"
							>
								<Async.default
									classNamePrefix="jellyfish-async-select"
									value={selectTargetValue}
									cacheOptions defaultOptions
									onChange={this.handleTargetSelect}
									loadOptions={this.getLinkTargets}
								/>
							</rendition.Box>
						</rendition.Flex>
					</rendition.Modal>
				)}
			</div>
		)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: {
			addChannel: redux.bindActionCreators(actionCreators.addChannel, dispatch)
		}
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

exports.CardLinker = reactDnd.DragSource('channel', cardSource, collect)(
	connect(null, mapDispatchToProps)(CardLinker)
)
