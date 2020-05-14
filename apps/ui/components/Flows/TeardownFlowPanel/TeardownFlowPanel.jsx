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
import {
	TextareaStep
} from '../Steps'
import {
	PersistStep,
	FinishStep
} from './Steps'
import {
	generateTeardownWhisper
} from './teardown-utils'

export default function TeardownFlowPanel ({
	flowId,
	card,
	flowState,
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
	const teardown = async () => {
		const {
			problem,
			solution
		} = flowState
		const cardTypeName = helpers.getType(card.type, types).name

		try {
			const linkActions = []

			const patch = helpers.patchPath(card, [ 'data', 'status' ], 'closed')

			linkActions.push(sdk.card.update(card.id, card.type, patch))

			// Create a whisper
			const whisper = generateTeardownWhisper(card, cardTypeName, problem, solution)
			linkActions.push(sdk.event.create(whisper))

			await Bluebird.all(linkActions)

			if (whisper) {
				analytics.track('element.create', {
					element: {
						type: whisper.type
					}
				})
			}
		} catch (error) {
			console.error('Failed to tear-down card', error)
			actions.addNotification('danger', 'Teardown failed. Refresh the page and try again.')
			return
		}

		onClose()
		setTimeout(() => {
			removeFlow()
		}, 600)
	}

	const {
		problem,
		solution
	} = flowState

	const cardTypeName = helpers.getType(card.type, types).name

	const completed = {
		problem: Boolean(problem),
		solution: Boolean(solution),
		persist: true
	}

	return (
		<StepsFlow
			title={`Close ${cardTypeName}`}
			titleIcon="archive"
			action="Close thread"
			onDone={teardown}
			onClose={onClose}
		>
			<StepsFlow.Step label="Problem" title="Describe the user's problem" status={stepStatus(completed.problem)}>
				<TextareaStep
					placeholder="Describe the problem that the user had"
					flowStatePropName="problem"
					rows={6}
					flowState={flowState}
					setFlow={setFlow}
				/>
			</StepsFlow.Step>
			<StepsFlow.Step label="Solution" title="Summarize the solution" status={stepStatus(completed.solution)}>
				<TextareaStep
					placeholder="Summarize the solution that solved the user's problem"
					flowStatePropName="solution"
					rows={6}
					flowState={flowState}
					setFlow={setFlow}
				/>
			</StepsFlow.Step>
			<StepsFlow.Step label="Links" title="Persist the knowledge" scrollable status={stepStatus(completed.persist)}>
				<PersistStep
					types={types}
					actions={actions}
					flowState={flowState}
					setFlow={setFlow}
				/>
			</StepsFlow.Step>
			<StepsFlow.Step label="Finish!" title="Is everything in order?" scrollable status="none">
				<FinishStep
					flowState={flowState}
				/>
			</StepsFlow.Step>
		</StepsFlow>
	)
}
