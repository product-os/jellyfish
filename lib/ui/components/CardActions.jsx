/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const copy = require('copy-to-clipboard')
const React = require('react')
const {
	connect
} = require('react-redux')
const redux = require('redux')
const rendition = require('rendition')
const core = require('../core')
const store = require('../core/store')
const helpers = require('../services/helpers')
const urlManager = require('../services/url-manager')
const CardLinker = require('./CardLinker')
const ContextMenu = require('./ContextMenu')
const ActionLink = require('../shame/ActionLink')
const Icon = require('../shame/Icon')
const IconButton = require('../shame/IconButton')
class Base extends React.Component {
	constructor (props) {
		super(props)
		this.delete = () => {
			core.sdk.card.remove(this.props.card.id, this.props.card.type)
				.catch((error) => {
					this.props.actions.addNotification('danger', error.message)
				})
			this.setState({
				showDeleteModal: false
			})
		}
		this.copyPermalink = (event) => {
			event.preventDefault()
			event.stopPropagation()
			copy(urlManager.createPermaLink(this.props.card))
		}
		this.copyJSON = (event) => {
			event.preventDefault()
			event.stopPropagation()
			copy(JSON.stringify(this.props.card, null, 2))
		}
		this.toggleMenu = () => {
			this.setState({
				showMenu: !this.state.showMenu
			})
		}
		this.toggleDeleteModal = () => {
			this.setState({
				showDeleteModal: !this.state.showDeleteModal
			})
		}
		this.openEditChannel = () => {
			this.props.actions.addChannel(helpers.createChannel({
				head: {
					action: 'edit',
					types: this.props.types,
					card: this.props.card,
					onDone: {
						action: 'close'
					}
				},
				canonical: false
			}))
		}

		// Omit known computed values from the schema
		this.state = {
			showDeleteModal: false,
			showMenu: false
		}
	}
	render () {
		return (
			<React.Fragment>
				<rendition.Flex align="right" justify="flex-end">
					<IconButton.IconButton
						plaintext
						square={true}
						mr={1}
						onClick={this.openEditChannel}
						className="card-actions__btn--edit"
						tooltip={{
							placement: 'left',
							text: 'Edit this element'
						}}
					>
						<Icon.default name="pencil-alt"/>
					</IconButton.IconButton>

					<CardLinker.CardLinker types={this.props.types} card={this.props.card}/>

					<span>
						<IconButton.IconButton
							px={2}
							mr={-1}
							plaintext
							onClick={this.toggleMenu}
							data-test="card-action-menu"
						>
							<Icon.default name="ellipsis-v"/>
						</IconButton.IconButton>

						{this.state.showMenu &&
							<ContextMenu.ContextMenu position="bottom" onClose={this.toggleMenu}>
								<React.Fragment>
									<ActionLink.ActionLink
										onClick={this.copyPermalink}
										tooltip={{
											text: 'Permalink copied!',
											trigger: 'click'
										}}
										data-test="card-action-menu__permalink"
									>
										Copy permalink
									</ActionLink.ActionLink>

									<ActionLink.ActionLink
										onClick={this.copyJSON}
										tooltip={{
											text: 'JSON copied!',
											trigger: 'click'
										}}
										data-test="card-action-menu__json"
									>
										Copy as JSON
									</ActionLink.ActionLink>

									<ActionLink.ActionLink onClick={this.toggleDeleteModal}>
											Delete
									</ActionLink.ActionLink>

									{this.props.children}
								</React.Fragment>
							</ContextMenu.ContextMenu>}
					</span>

				</rendition.Flex>

				{this.state.showDeleteModal && (
					<rendition.Modal
						title="Are you sure you want to delete this item?"
						cancel={this.toggleDeleteModal}
						done={this.delete}
					/>
				)}

			</React.Fragment>
		)
	}
}
const mapStateToProps = (state) => {
	return {
		types: store.selectors.getTypes(state)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
	}
}
exports.CardActions = connect(mapStateToProps, mapDispatchToProps)(Base)
