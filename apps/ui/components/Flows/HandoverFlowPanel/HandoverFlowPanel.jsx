/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import Bluebird from 'bluebird'
import {
	stepStatus
} from '../flow-utils'
import * as helpers from '../../../../../lib/ui-components/services/helpers'
import StepsFlow from '../../../../../lib/ui-components/StepsFlow'
import * as handoverUtils from './handover-utils'
import {
	NewOwnerStep
} from './Steps'
import {
	TextareaStep
} from '../Steps'

export default function HandoverFlowPanel ({
	flowId,
	card,
	cardOwner,
	updateCardOwnerCache,
	flowState,
	user,
	types,
	actions,
	analytics,
	sdk,
	onClose
}) {
	const setFlow = (updatedFlowState) => {
		return actions.setFlow(flowId, card.id, updatedFlowState)
	}
	const removeFlow = () => {
		return actions.removeFlow(flowId, card.id)
	}
	const transferOwnership = async () => {
		const {
			newOwner,
			unassigned,
			reason,
			statusDescription
		} = flowState
		const cardTypeName = helpers.getType(card.type, types).name

		try {
			// Check we're not trying to reasssign the issue to the current owner
			// (Note: the NewOwnerStep component should prevent this anyway)
			if (cardOwner && newOwner && cardOwner.id === newOwner.id) {
				actions.addNotification('danger', `${helpers.userDisplayName(cardOwner)} already owns this ${cardTypeName}`)
				return
			}

			const linkActions = []

			// Unassign the current owner
			if (cardOwner) {
				await sdk.card.unlink(card, cardOwner, 'is owned by')
			} else if (unassigned) {
				console.warn(`No current owner found when unassigning the card ${card.slug}`)
			}

			if (newOwner) {
				// Link the new owner to the card
				linkActions.push(sdk.card.link(card, newOwner, 'is owned by'))
			}

			if (handoverUtils.schemaSupportsStatusText(types, card)) {
				// Update the status field of the card
				const patch = helpers.patchPath(card, [ 'data', 'statusDescription' ], statusDescription.trim())
				linkActions.push(sdk.card.update(card.id, card.type, patch))
			}

			// Create a whisper
			const whisper = handoverUtils.getHandoverWhisperEventCard(card, cardOwner, newOwner, reason.trim())
			if (whisper) {
				linkActions.push(sdk.event.create(whisper))
			}

			await Bluebird.all(linkActions)

			if (whisper) {
				analytics.track('element.create', {
					element: {
						type: whisper.type
					}
				})
			}

			// Finally, update the card owner cache
			updateCardOwnerCache(newOwner || null)
		} catch (error) {
			console.error('Failed to assign card', error)
			actions.addNotification('danger', 'Handover failed. Refresh the page and try again.')
			return
		}

		onClose()
		setTimeout(() => {
			removeFlow()
		}, 600)
	}

	const {
		newOwner,
		userError,
		unassigned,
		reason,
		statusDescription
	} = flowState

	const cardTypeName = helpers.getType(card.type, types).name

	const newOwnerDisplayName = newOwner ? helpers.userDisplayName(newOwner) : null

	const completed = {
		ownership: unassigned || (newOwner && !userError),
		reason: Boolean(reason),
		statusDescription: Boolean(statusDescription)
	}

	const supportsStatus = handoverUtils.schemaSupportsStatusText(types, card)
	return (
		<StepsFlow
			title="Transfer Ownership"
			titleIcon="user-edit"
			action={
				unassigned
					? 'Unassign'
					: `Transfer ownership${newOwner ? ` to ${newOwnerDisplayName}` : ''}`
			}
			onDone={transferOwnership}
			onClose={onClose}
		>
			<StepsFlow.Step label="Ownership" title="Select new owner" status={stepStatus(completed.ownership)}>
				<NewOwnerStep
					user={user}
					currentOwner={cardOwner}
					types={types}
					flowState={flowState}
					setFlow={setFlow}
				/>
			</StepsFlow.Step>
			<StepsFlow.Step label="Reason" title="Give a reason" status={stepStatus(completed.reason)}>
				<TextareaStep
					placeholder={
						unassigned
							? 'Explain why you are unassigning this issue'
							: `Explain why you are transferring ownership${
								newOwnerDisplayName ? ` to ${newOwnerDisplayName}` : ''}`
					}
					flowStatePropName="reason"
					flowState={flowState}
					setFlow={setFlow}
				/>
			</StepsFlow.Step>
			{supportsStatus && (
				<StepsFlow.Step label="Status" title="Set the status" status={stepStatus(completed.statusDescription)}>
					<TextareaStep
						placeholder={`Fully describe the current status of this ${cardTypeName}`}
						flowStatePropName="statusDescription"
						flowState={flowState}
						setFlow={setFlow}
					/>
				</StepsFlow.Step>
			)}
		</StepsFlow>
	)
}
