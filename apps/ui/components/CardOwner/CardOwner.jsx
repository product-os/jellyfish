/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import path from 'path'
import {
	Txt,
	DropDownButton
} from 'rendition'
import _ from 'lodash'
import styled from 'styled-components'
import {
	userDisplayName,
	getType
} from '../../../../lib/ui-components/services/helpers'
import {
	ActionLink
} from '../../../../lib/ui-components/shame/ActionLink'
import {
	FLOW_IDS
} from '../Flows/flow-utils'
import * as handoverUtils from '../Flows/HandoverFlowPanel/handover-utils'

const OwnerTxt = styled(Txt.span) `
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 120px;
`

export default class CardOwner extends React.Component {
	constructor (props) {
		super(props)
		this.assignToMe = this.assignToMe.bind(this)
		this.unassign = this.unassign.bind(this)
		this.assign = this.assign.bind(this)
		this.handover = this.handover.bind(this)
		this.openOwnerChannel = this.openOwnerChannel.bind(this)
	}

	async assignToMe () {
		const {
			cardOwner,
			actions,
			card,
			sdk,
			user
		} = this.props
		const cardTypeName = getType(card.type).name

		try {
			if (cardOwner) {
				await sdk.card.unlink(card, cardOwner, 'is owned by')
			}

			await sdk.card.link(card, user, 'is owned by')

			this.props.updateCardOwnerCache(user)

			actions.addNotification('success', `${cardTypeName} assigned to me`)

			// Now generate a whisper in this card's timeline to detail the self-assignment
			const whisper = handoverUtils.getHandoverWhisperEventCard(card, cardOwner, user)
			if (whisper) {
				await sdk.event.create(whisper)
					.catch((err) => {
						actions.addNotification('danger', 'Failed to create whisper')
						console.error('Failed to create whisper', err)
					})
			}
		} catch (err) {
			actions.addNotification('danger', `Failed to assign ${cardTypeName}`)
			console.error('Failed to create link', err)
		}
	}

	handover (unassigned) {
		const {
			actions,
			card
		} = this.props
		const flowState = {
			isOpen: true,
			card,
			unassigned
		}
		if (unassigned) {
			flowState.newOwner = null
			flowState.userError = null
		}
		actions.setFlow(FLOW_IDS.GUIDED_HANDOVER, card.id, flowState)
	}

	unassign () {
		this.handover(true)
	}

	assign () {
		this.handover(false)
	}

	openOwnerChannel (event) {
		const {
			cardOwner,
			history
		} = this.props
		event.preventDefault()
		event.stopPropagation()
		history.push(path.join(window.location.pathname, cardOwner.slug))
	}

	render () {
		const {
			card,
			cardOwner,
			types,
			user
		} = this.props

		const cardTypeName = getType(card.type, types).name

		return (
			<React.Fragment>
				<DropDownButton
					data-test="card-owner-dropdown"
					mr={3}
					tertiary={cardOwner && (cardOwner.id === user.id)}
					quartenary={cardOwner && (cardOwner.id !== user.id)}
					label={cardOwner ? (
						<OwnerTxt
							bold
							data-test="card-owner-dropdown__label--assigned"
							onClick={this.openOwnerChannel}
							tooltip={{
								text: `${userDisplayName(cardOwner)} owns this ${cardTypeName}`,
								placement: 'bottom'
							}}
						>
							{userDisplayName(cardOwner)}
						</OwnerTxt>
					) : (
						<OwnerTxt
							bold
							italic
							data-test="card-owner-dropdown__label--unassigned"
							tooltip={{
								text: `This ${cardTypeName} is unassigned`,
								placement: 'bottom'
							}}
						>
						Unassigned
						</OwnerTxt>
					)}
				>
					<ActionLink
						disabled={Boolean(cardOwner && (cardOwner.id === user.id))}
						onClick={!cardOwner || (cardOwner.id !== user.id) ? this.assignToMe : _.noop}
						data-test="card-owner-menu__assign-to-me"
					>
					Assign to me
					</ActionLink>

					<ActionLink
						disabled={!cardOwner}
						onClick={cardOwner ? () => { this.unassign(false) } : _.noop}
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
			</React.Fragment>
		)
	}
}
