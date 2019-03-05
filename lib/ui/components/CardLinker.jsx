/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const React = require('react')
const Async = require('react-select/lib/Async')
const rendition = require('rendition')
const CardCreator = require('../components/CardCreator')
const constants = require('../constants')
const core = require('../core')
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
				showCreateModal: false,
				showMenu: false
			})
		}
		this.openCreateModal = () => {
			this.setState({
				showLinkModal: false,
				showCreateModal: true,
				showMenu: false
			})
		}
		this.hideLinkModal = () => {
			this.setState({
				showLinkModal: false,
				showCreateModal: false,
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
			const results = await core.sdk.query(filter)
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
				selectedTypeTarget
			} = this.state
			if (!selectedTypeTarget) {
				return
			}
			const linkName = constants.LINKS[card.type][selectedTypeTarget.slug]
			link.createLink(this.props.card, selectedTypeTarget, linkName)
			this.setState({
				showLinkModal: false
			})
		}
		this.toggleMenu = () => {
			this.setState({
				showMenu: !this.state.showMenu
			})
		}
		this.doneCreatingCard = (newCard) => {
			const {
				card
			} = this.props
			const {
				selectedTypeTarget
			} = this.state
			if (!newCard) {
				return
			}
			if (!selectedTypeTarget) {
				return
			}
			const linkName = constants.LINKS[card.type][selectedTypeTarget.slug]
			link.createLink(this.props.card, newCard, linkName)
			this.setState({
				showLinkModal: false,
				showCreateModal: false
			})
		}
		const {
			card, types
		} = props
		this.state = {
			showMenu: false,
			showLinkModal: false,
			showCreateModal: false,
			results: [],
			selectedTarget: null,
			selectedTypeTarget: _.find(types, {
				slug: _.first(_.keys(constants.LINKS[card.type]))
			}) || null
		}
	}
	render () {
		const {
			card, types
		} = this.props
		const {
			showCreateModal, showLinkModal, selectedTarget, selectedTypeTarget
		} = this.state
		const availableTypes = types.filter((type) => {
			return constants.LINKS[card.type] && constants.LINKS[card.type].hasOwnProperty(type.slug)
		})
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
		return (<React.Fragment>
			<span>
				<IconButton.IconButton plaintext square={true} onClick={this.toggleMenu} tooltip={{
					placement: 'left',
					text: `Link this ${typeName} to another element`
				}}>
					<Icon.default name="bezier-curve"/>
				</IconButton.IconButton>

				{this.state.showMenu && (
					<ContextMenu.ContextMenu position="bottom" onClose={this.toggleMenu}>
						<rendition.Button style={{
							display: 'block'
						}} mb={2} plaintext onClick={this.openLinkModal}>
							Link to existing element
						</rendition.Button>
						<rendition.Button style={{
							display: 'block'
						}} plaintext onClick={this.openCreateModal}>
							Create a new element to link to
						</rendition.Button>
					</ContextMenu.ContextMenu>
				)}
			</span>

			{showLinkModal && (
				<rendition.Modal
					title={`Link this ${typeName} to another element`}
					cancel={this.hideLinkModal}
					primaryButtonProps={{
						disabled: !selectedTypeTarget
					}}
					done={this.linkToExisting}
				>
					<rendition.Flex align="center">
						<rendition.Txt>
							Link this {typeName} to
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
						<rendition.Box flex="1" ml={2}>
							<Async.default
								value={selectTargetValue}
								cacheOptions defaultOptions
								onChange={this.handleTargetSelect}
								loadOptions={this.getLinkTargets}
							/>
						</rendition.Box>
					</rendition.Flex>
				</rendition.Modal>
			)}

			<CardCreator.CardCreator
				seed={{}}
				show={showCreateModal}
				type={availableTypes}
				done={this.doneCreatingCard}
				cancel={() => {
					return this.setState({
						showCreateModal: false, showLinkModal: true
					})
				}}
			/>
		</React.Fragment>)
	}
}
exports.CardLinker = CardLinker
