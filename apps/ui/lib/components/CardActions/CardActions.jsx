/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import copy from 'copy-to-clipboard'
import React from 'react'
import {
	Button,
	Flex,
	Modal
} from 'rendition'
import {
	supportsLink
} from '@balena/jellyfish-client-sdk/lib/link-constraints'
import {
	ActionLink,
	addNotification,
	ContextMenu,
	Icon,
	helpers
} from '@balena/jellyfish-ui-components'
import CardLinker from '../CardLinker'
import CardOwner from '../CardOwner'
import VideoLink from '../VideoLink'

export default class CardActions extends React.Component {
	constructor (props) {
		super(props)
		this.delete = () => {
			props.sdk.card.remove(this.props.card.id, this.props.card.type)
				.then(() => {
					addNotification('success', 'Deleted card')
				})
				.catch((error) => {
					addNotification('danger', error.message)
				})
			this.setState({
				showDeleteModal: false
			})
		}
		this.copyPermalink = (event) => {
			event.preventDefault()
			event.stopPropagation()
			copy(helpers.createPermaLink(this.props.card))
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
					types: this.props.types,
					card: this.props.card,
					onDone: {
						action: 'close'
					}
				},
				format: 'edit',
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
		const supportsOwnership = supportsLink(this.props.card.type, 'is owned by')
		return (
			<React.Fragment>
				<Flex alignItems="center" justifyContent="flex-end">
					{this.props.inlineActionItems}
					{supportsOwnership && (
						<CardOwner
							user={this.props.user}
							types={this.props.types}
							card={this.props.card}
							sdk={this.props.sdk}
							actions={this.props.actions} />
					)}
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

					<VideoLink card={this.props.card} mr={3} />

					<CardLinker types={this.props.types} card={this.props.card} actions={this.props.actions} />

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
							<ContextMenu position="bottom" onClose={this.toggleMenu}>
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
							</ContextMenu>}
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
