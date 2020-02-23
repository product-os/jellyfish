/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import path from 'path'
import {
	Box,
	Txt,
	DropDownButton
} from 'rendition'
import _ from 'lodash'
import {
	withRouter
} from 'react-router-dom'
import {
	getType,
	userDisplayName
} from '../services/helpers'
import {
	ActionLink
} from '../shame/ActionLink'
import LinkModal from '../LinkModal'
import Icon from '../shame/Icon'

class CardOwner extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			showLinkModal: false
		}
		this.assignToMe = this.assignToMe.bind(this)
		this.unassign = this.unassign.bind(this)
		this.assign = this.assign.bind(this)
		this.hideLinkModal = this.hideLinkModal.bind(this)
		this.openOwnerChannel = this.openOwnerChannel.bind(this)
	}

	assignToMe () {
		const {
			actions,
			card,
			user,
			onRefresh
		} = this.props
		const cardTypeName = card.type.split('@')[0]
		this.setState({
			busy: true
		}, async () => {
			await this.unassign(true)

			actions.createLink(card, user, 'is owned by', {
				skipSuccessMessage: true
			})
				.then(async (data) => {
					actions.addNotification('success', `${cardTypeName} assigned to me`)
					await onRefresh()
				})
				.catch((err) => {
					actions.addNotification('danger', `Failed to assign ${cardTypeName}`)
					console.error('Failed to create link', err)
				})
				.finally(() => {
					this.setState({
						busy: false
					})
				})
		})
	}

	async unassign (isInTransaction = false) {
		const {
			sdk,
			actions,
			card,
			links,
			onRefresh
		} = this.props
		if (links && links.length) {
			const ownerName = userDisplayName(links[0])
			const cardTypeName = card.type.split('@')[0]
			const owner = links[0]
			if (!isInTransaction) {
				this.setState({
					busy: true
				})
			}

			try {
				await sdk.card.unlink(card, owner, 'is owned by')
				if (!isInTransaction) {
					actions.addNotification('success', `${ownerName} was unassigned from this ${cardTypeName}`)
					await onRefresh()
				}
			} catch (err) {
				actions.addNotification('danger', `Could not unassign ${ownerName} from the ${cardTypeName}`)
				console.error('Failed to remove link', err)
			} finally {
				if (!isInTransaction) {
					this.setState({
						busy: false
					})
				}
			}
		}
	}

	assign () {
		this.setState({
			showLinkModal: true
		})
	}

	hideLinkModal () {
		this.setState({
			showLinkModal: false
		})
		this.props.onRefresh()
	}

	openOwnerChannel (ev) {
		const {
			links, history
		} = this.props
		ev.preventDefault()
		ev.stopPropagation()
		const owner = links && links.length === 1 ? links[0] : null
		history.push(path.join(window.location.pathname, owner.slug))
	}

	render () {
		const {
			user,
			card,
			types,
			sdk,
			links,
			linkNotSupported
		} = this.props
		const {
			busy,
			showLinkModal
		} = this.state

		if (linkNotSupported) {
			return null
		}

		const type = getType('user', types)
		const owner = links && links.length ? links[0] : null
		const cardTypeName = card.type.split('@')[0]
		const linkType = _.find(
			sdk.LINKS,
			// eslint-disable-next-line lodash/matches-shorthand
			(link) => { return link.name === 'is owned by' && link.data.from === card.type.split('@')[0] }
		)

		if (!links) {
			return (
				<Box mr={3}>
					<Icon name="cog" spin />
				</Box>
			)
		}
		return (
			<React.Fragment>
				<DropDownButton
					data-test="card-owner-dropdown"
					mr={3}
					tertiary={owner && (owner.id === user.id)}
					quartenary={owner && (owner.id !== user.id)}
					disabled={busy}
					label={owner ? (
						<Txt.span data-test="card-owner-dropdown__label--assigned" onClick={this.openOwnerChannel} bold tooltip={{
							text: `${userDisplayName(owner)} owns this ${cardTypeName}`,
							placement: 'bottom'
						}}>{userDisplayName(owner)}</Txt.span>
					) : (
						<Txt.span data-test="card-owner-dropdown__label--unassigned" bold italic tooltip={{
							text: `This ${cardTypeName} is unassigned`,
							placement: 'bottom'
						}}>Unassigned</Txt.span>
					)}
				>
					<ActionLink
						disabled={owner && (owner.id === user.id)}
						onClick={!owner || (owner.id !== user.id) ? this.assignToMe : _.noop}
						data-test="card-owner-menu__assign-to-me"
					>
					Assign to me
					</ActionLink>

					<ActionLink
						disabled={!owner}
						onClick={owner ? () => { this.unassign(false) } : _.noop}
						data-test="card-owner-menu__unassign"
					>
					Unassign
					</ActionLink>

					<ActionLink
						onClick={this.assign}
						data-test="card-owner-menu__assign"
					>
					Assign to someone else
					</ActionLink>
				</DropDownButton>

				<LinkModal
					linkType={linkType}
					card={card}
					types={[ type ]}
					show={showLinkModal}
					onHide={this.hideLinkModal}
					linkCreatedNotificationMessage={
						(from, to) => { return `${from.type.split('@')[0]} assigned to ${userDisplayName(to)}` }
					}
				/>
			</React.Fragment>
		)
	}
}

export default withRouter(CardOwner)
