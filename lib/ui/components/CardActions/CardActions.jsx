/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import copy from 'copy-to-clipboard'
import _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	Button,
	Flex,
	Modal
} from 'rendition'
import {
	actionCreators,
	sdk,
	selectors
}	from '../../core'
import {
	createPermaLink
} from '../../services/url-manager'
import CardLinker from '../CardLinker'
import ContextMenu from '../ContextMenu'
import {
	ActionLink
} from '../../shame/ActionLink'
import Icon from '../../shame/Icon'

class CardActions extends React.Component {
	constructor (props) {
		super(props)
		this.delete = () => {
			sdk.card.remove(this.props.card.id, this.props.card.type)
				.then(() => {
					this.props.actions.addNotification('success', 'Deleted card')
				})
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
			copy(createPermaLink(this.props.card))
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
			this.props.actions.addChannel({
				head: {
					action: 'edit',
					types: this.props.types,
					card: this.props.card,
					onDone: {
						action: 'close'
					}
				},
				canonical: false
			})
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
				<Flex alignItems="center" justifyContent="flex-end">
					<Button
						plain
						mr={3}
						onClick={this.openEditChannel}
						className="card-actions__btn--edit"
						tooltip={{
							placement: 'left',
							text: 'Edit this element'
						}}
						icon={<Icon name="pencil-alt"/>}
					/>

					<CardLinker types={this.props.types} card={this.props.card}/>

					<span>
						<Button
							px={2}
							mr={-1}
							plain
							onClick={this.toggleMenu}
							data-test="card-action-menu"
							icon={<Icon name="ellipsis-v"/>}
						/>

						{this.state.showMenu &&
							<ContextMenu.ContextMenu position="bottom" onClose={this.toggleMenu}>
								<React.Fragment>
									<ActionLink
										onClick={this.copyPermalink}
										tooltip={{
											text: 'Permalink copied!',
											trigger: 'click'
										}}
										data-test="card-action-menu__permalink"
									>
										Copy permalink
									</ActionLink>

									<ActionLink
										onClick={this.copyJSON}
										tooltip={{
											text: 'JSON copied!',
											trigger: 'click'
										}}
										data-test="card-action-menu__json"
									>
										Copy as JSON
									</ActionLink>

									<ActionLink
										onClick={this.toggleDeleteModal}
										data-test="card-action-menu__delete"
									>
											Delete
									</ActionLink>

									{this.props.children}
								</React.Fragment>
							</ContextMenu.ContextMenu>}
					</span>

				</Flex>

				{this.state.showDeleteModal && (
					<Modal
						title="Are you sure you want to delete this item?"
						cancel={this.toggleDeleteModal}
						done={this.delete}
						primaryButtonProps={{
							'data-test': 'card-delete__submit'
						}}
					/>
				)}

			</React.Fragment>
		)
	}
}

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addNotification',
				'addChannel'
			]),
			dispatch
		)
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(CardActions)
