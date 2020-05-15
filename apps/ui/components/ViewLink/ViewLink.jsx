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
import Link from '../../../../lib/ui-components/Link'
import MentionsCount from '../../../../lib/ui-components/MentionsCount'
import * as helpers from '../../../../lib/ui-components/services/helpers'
import ContextMenu from '../../../../lib/ui-components/ContextMenu'
import Icon from '../../../../lib/ui-components/shame/Icon'

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
			isHomeView,
			activeSlice,
			card,
			isActive,
			isStarred,
			user,
			update
		} = this.props

		const isCustomView = helpers.isCustomView(card, user)

		return (
			<Box>
				<Flex justifyContent="space-between" bg={(isActive && !activeSlice) ? '#eee' : 'none'}>
					<Link
						data-test={`home-channel__item--${card.slug}`}
						style={{
							display: 'block',
							flex: '1'
						}}
						key={card.id}
						py={2}
						pl={3}
						pr={isActive ? 0 : 3}
						color="#333"
						to={`/${card.slug || card.id}`}
					>
						<Flex justifyContent="space-between" alignItems="center">
							{card.name}
							{isHomeView && (
								<Box fontSize="80%" color="gray.dark" mx={2} tooltip="Default view">
									<Icon name="home" />
								</Box>
							)}
							{Boolean(update) && card.slug === 'view-my-inbox' && (
								<MentionsCount mr={2}>{update}</MentionsCount>
							)}
						</Flex>
					</Link>

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
								<Button
									style={{
										display: 'block'
									}}
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
								</Button>
								<Button
									style={{
										display: 'block'
									}}
									mt={2}
									plain
									data-test="view-link--star-view-btn"
									onClick={this.toggleViewStarred}
								>
									{isStarred ? 'Un-star this view' : 'Star this view'}
								</Button>
								{ isCustomView && (
									<Button
										style={{
											display: 'block'
										}}
										mt={2}
										plain
										data-test="view-link--delete-view-btn"
										tooltip="Delete this view"
										onClick={this.showDeleteModal}
									>
										Delete custom view
									</Button>
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
