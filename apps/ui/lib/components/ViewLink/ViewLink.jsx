/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	circularDeepEqual
} from 'fast-equals'
import React from 'react'
import {
	Button,
	Box,
	Flex,
	Modal
} from 'rendition'
import {
	ActionButton,
	ActionRouterLink,
	ContextMenu,
	helpers,
	Icon,
	MentionsCount
} from '@balena/jellyfish-ui-components'

export default class ViewLink extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			showDeleteModal: false,
			showMenu: false
		}

		this.setDefault = this.setDefault.bind(this)
		this.toggleMenu = this.toggleMenu.bind(this)
		this.removeView = this.removeView.bind(this)
		this.showDeleteModal = this.showDeleteModal.bind(this)
		this.hideDeleteModal = this.hideDeleteModal.bind(this)
		this.toggleViewStarred = this.toggleViewStarred.bind(this)
	}

	toggleMenu (event) {
		if (event) {
			event.preventDefault()
			event.stopPropagation()
		}
		this.setState({
			showMenu: !this.state.showMenu
		})
	}

	showDeleteModal () {
		this.setState({
			showDeleteModal: true
		})
	}

	hideDeleteModal () {
		this.setState({
			showDeleteModal: false
		})
	}

	toggleViewStarred () {
		const {
			card,
			isStarred,
			actions: {
				setViewStarred
			}
		} = this.props
		setViewStarred(card, !isStarred)
	}

	setDefault () {
		const {
			actions,
			card,
			isHomeView
		} = this.props
		actions.setDefault(isHomeView ? null : card)
	}

	removeView () {
		this.hideDeleteModal()
		this.props.actions.removeView(this.props.card)
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	render () {
		const {
			label,
			isHomeView,
			activeSlice,
			card,
			isActive,
			isStarred,
			userSlug,
			update
		} = this.props

		const isCustomView = helpers.isCustomView(card, userSlug)

		return (
			<Box>
				<Flex justifyContent="space-between" bg={(isActive && !activeSlice) ? '#eee' : 'none'}>
					<ActionRouterLink
						data-test={`home-channel__item--${card.slug}`}
						key={card.id}
						pl={3}
						pr={isActive ? 0 : 3}
						color="#333"
						to={`/${card.slug || card.id}`}
					>
						<Flex justifyContent="space-between" alignItems="center">
							{label || card.name}
							{isHomeView && (
								<Box fontSize="80%" color="gray.dark" mx={2} tooltip="Default view">
									<Icon name="home" />
								</Box>
							)}
							{Boolean(update) && (
								<MentionsCount mr={2}>{update}</MentionsCount>
							)}
						</Flex>
					</ActionRouterLink>

					{isActive &&
							<Button
								data-test="view-link--context-menu-btn"
								pr={3}
								pl={1}
								plain
								onClick={this.toggleMenu}
								icon={<Icon name="ellipsis-v"/>}
							/>
					}

					{this.state.showMenu &&
							<ContextMenu onClose={this.toggleMenu}>
								<ActionButton
									plain
									data-test="view-link--set-default-btn"
									tooltip={{
										text: `${isHomeView ? 'Unset' : 'Set'} this view as the default page when logging in`,
										containerStyle: {
											maxWidth: '400px'
										}
									}}
									onClick={this.setDefault}
								>
									{`${isHomeView ? 'Unset' : 'Set'} as default`}
								</ActionButton>
								<ActionButton
									plain
									data-test="view-link--star-view-btn"
									onClick={this.toggleViewStarred}
								>
									{isStarred ? 'Un-star this view' : 'Star this view'}
								</ActionButton>
								{ isCustomView && (
									<ActionButton
										plain
										data-test="view-link--delete-view-btn"
										tooltip="Delete this view"
										onClick={this.showDeleteModal}
									>
										Delete custom view
									</ActionButton>
								)}
							</ContextMenu>
					}
				</Flex>

				{this.state.showDeleteModal && (
					<Modal
						title="Are you sure you want to delete this view?"
						cancel={this.hideDeleteModal}
						done={this.removeView}
						action="Yes"
						primaryButtonProps={{
							'data-test': 'view-delete__submit'
						}}
					/>
				)}
			</Box>
		)
	}
}
