/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import Bluebird from 'bluebird';
import { notifications, helpers } from '@balena/jellyfish-ui-components';
import { stepStatus } from '../flow-utils';
import StepsFlow from '../../StepsFlow';
import { TextareaStep } from '../Steps';
import { PersistStep, RateStep, FinishStep } from './Steps';

const getEvent = (target, type, payload, messageKey = 'message') => {
	const messageSymbolRE = /^\s*%\s*/;
	const { mentionsUser, alertsUser, mentionsGroup, alertsGroup, tags } =
		helpers.getMessageMetaData(payload[messageKey]);

	return {
		target,
		type,
		tags,
		payload: {
			...payload,
			mentionsUser,
			alertsUser,
			mentionsGroup,
			alertsGroup,
			[messageKey]: helpers.replaceEmoji(
				payload[messageKey].replace(messageSymbolRE, ''),
			),
		},
	};
};

export default function TeardownFlowPanel({
	flowId,
	card,
	flowState,
	types,
	actions,
	analytics,
	sdk,
	onClose,
}) {
	const { summary, rating } = flowState;

	const setFlow = (updatedFlowState) => {
		return actions.setFlow(flowId, card.id, updatedFlowState);
	};
	const removeFlow = () => {
		return actions.removeFlow(flowId, card.id);
	};
	const teardown = async () => {
		try {
			const linkActions: any[] = [];

			const patch = helpers.patchPath(card, ['data', 'status'], 'closed');
			linkActions.push(sdk.card.update(card.id, card.type, patch));

			const summaryEvent = getEvent(card, 'summary', {
				message: summary,
			});

			linkActions.push(sdk.event.create(summaryEvent));

			if (rating.score || rating.comment) {
				const ratingEvent = getEvent(card, 'rating', rating, 'comment');
				linkActions.push(sdk.event.create(ratingEvent));
			}

			await Bluebird.all(linkActions);

			analytics.track('element.create', {
				element: {
					type: summaryEvent.type,
				},
			});
		} catch (error) {
			console.error('Failed to tear-down card', error);
			notifications.addNotification(
				'danger',
				'Teardown failed. Refresh the page and try again.',
			);
			return;
		}

		onClose();
		setTimeout(() => {
			removeFlow();
		}, 600);
	};

	const cardTypeName = helpers.getType(card.type, types).name;

	const completed = {
		summary: Boolean(summary),
		persist: true,
		rating: true,
	};

	return (
		<StepsFlow
			title={`Close ${cardTypeName}`}
			titleIcon="archive"
			action="Close thread"
			onDone={teardown}
			onClose={onClose}
		>
			<StepsFlow.Step
				label="Summary"
				title="Summarize the problem and the solution"
				status={stepStatus(completed.summary)}
			>
				<TextareaStep
					placeholder="Describe the problem that the user had and the solution to that problem"
					flowStatePropName="summary"
					rows={6}
					flowState={flowState}
					setFlow={setFlow}
				/>
			</StepsFlow.Step>
			<StepsFlow.Step
				label="Links"
				title="Persist the knowledge"
				scrollable
				status={stepStatus(completed.persist)}
			>
				<PersistStep
					types={types}
					actions={actions}
					flowState={flowState}
					setFlow={setFlow}
				/>
			</StepsFlow.Step>
			<StepsFlow.Step
				label="Rate"
				title="Rate your experience"
				scrollable
				status={stepStatus(completed.rating)}
			>
				<RateStep flowState={flowState} setFlow={setFlow} />
			</StepsFlow.Step>
			<StepsFlow.Step
				label="Finish!"
				title="Is everything in order?"
				scrollable
				status="none"
			>
				<FinishStep flowState={flowState} />
			</StepsFlow.Step>
		</StepsFlow>
	);
}
