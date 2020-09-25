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
import Link from '@balena/jellyfish-ui-components/lib/Link'
import MentionsCount from '@balena/jellyfish-ui-components/lib/MentionsCount'
import * as helpers from '@balena/jellyfish-ui-components/lib/services/helpers'
import ContextMenu from '@balena/jellyfish-ui-components/lib/ContextMenu'
import Icon from '@balena/jellyfish-ui-components/lib/shame/Icon'
import {
	withTheme
} from 'styled-components'

class ViewLink extends React.Component {
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
			update,
			theme
		} = this.props

		const isCustomView = helpers.isCustomView(card, userSlug)

		return (
			<Box>
				<Flex justifyContent="space-between" bg={(isActive && !activeSlice) ? theme.colors.background.dark : 'none'}>
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
						color={theme.colors.text.main}
						to={`/${card.slug || card.id}`}
					>
						<Flex justifyContent="space-between" alignItems="center">
							{label || card.name}
							{isHomeView && (
								<Box fontSize="80%" color={theme.colors.text.light} mx={2} tooltip="Default view">
									<Icon name="home" />
								</Box>
							)}
							{Boolean(update) && (
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
								primary
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
									primary
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
									primary
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
										primary
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

export default (withTheme)(ViewLink)
