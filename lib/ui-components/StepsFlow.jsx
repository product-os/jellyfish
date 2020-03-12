/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable valid-jsdoc */
/* eslint-disable jsdoc/require-param */

import React from 'react'
import {
	Box,
	Button,
	Heading,
	Flex,
	Steps,
	Step
} from 'rendition'
import _ from 'lodash'

const VALID_STEP_STATUSES = {
	pending: true,
	completed: true,
	none: true
}

const nonePending = (stepStatuses) => {
	return _.every(
		stepStatuses,
		(status) => { return status !== 'pending' }
	)
}

/**
 * Each StepsFlow.Step should define the following props:
 * - 'label' (to be used as the step label and also the title above the step content)
 * - 'status' ('pending', 'completed' or 'none')
 * - 'children' (the step content, to be displayed when the step is active)
 */
const FlowStep = ({
	stepIndex, label, status, children, ...rest
}) => {
	return (
		<Box my={3} {...rest}>
			<Heading.h5 data-test={`flow-step-${stepIndex}__heading`} mb={2}>{label}</Heading.h5>
			{children}
		</Box>
	)
}

/**
 * The StepsFlow component is a light wrapper around the Rendition 'Steps'
 * component. It manages the rendering of the active step's content as
 * well as handling the user clicking on a step to select a different step.
 *
 * Children of StepsFlow must be of type StepsFlow.Step.
 */
const StepsFlow = ({
	initialStep,
	onDone,
	stepsProps,
	children,
	action,
	...rest
}) => {
	if (initialStep > children.length - 1 || initialStep < 0) {
		throw new Error('initialStep is out of bounds')
	}
	const [ activeStepIndex, setActiveStepIndex ] = React.useState(initialStep || 0)
	const stepStatuses = _.map(children, 'props.status')
	const allComplete = nonePending(stepStatuses)
	return (
		<Flex {...rest} flex={1} flexDirection="column">
			<Steps flex={0} className="flow-steps" {...stepsProps}>
				{React.Children.map(children, (step, stepIndex) => {
					if (step.type !== FlowStep) {
						throw new Error(
							'You can only use StepsFlow.Step components as children of StepsFlow.'
						)
					}
					if (!VALID_STEP_STATUSES[step.props.status]) {
						throw new Error(
							`Invalid step status: ${step.props.status}`
						)
					}

					// Link should be active if:
					// - its a previous step OR
					// - its not the current step AND all previous steps are not pending
					const clickHandler = (stepIndex < activeStepIndex) ||
						(stepIndex !== activeStepIndex && nonePending(stepStatuses.slice(0, stepIndex)))
						? () => { return setActiveStepIndex(stepIndex) }
						: null
					return (
						<Step
							key={step.props.label}
							status={step.props.status}
							onClick={clickHandler}
						>
							{step.props.label}
						</Step>
					)
				})}
			</Steps>
			<Box flex={1}>
				{React.cloneElement(children[activeStepIndex], {
					stepIndex: activeStepIndex
				})}
			</Box>
			<Flex flex={0} alignItems="center" justifyContent="space-between">
				<Button
					data-test="steps-flow__prev-btn"
					disabled={activeStepIndex === 0}
					onClick={() => { return setActiveStepIndex(activeStepIndex - 1) }}
				>
					Previous
				</Button>
				{ activeStepIndex < children.length - 1 && (
					<Button
						data-test="steps-flow__next-btn"
						disabled={children[activeStepIndex].props.status === 'pending'}
						onClick={() => { return setActiveStepIndex(activeStepIndex + 1) }}
					>
						Next
					</Button>
				)}
				{ activeStepIndex === children.length - 1 && (
					<Button
						disabled={!allComplete}
						data-test="steps-flow__action-btn"
						onClick={onDone}
						primary
					>
						{action}
					</Button>
				)}
			</Flex>
		</Flex>
	)
}

StepsFlow.defaultProps = {
	initialStep: 0,
	action: 'Go!'
}

StepsFlow.Step = FlowStep

export default StepsFlow
