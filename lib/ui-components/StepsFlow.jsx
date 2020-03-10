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
	Heading,
	Steps,
	Step
} from 'rendition'

const VALID_STEP_STATUSES = {
	pending: true,
	completed: true,
	none: true
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
	stepsProps,
	children,
	...rest
}) => {
	if (initialStep > children.length - 1 || initialStep < 0) {
		throw new Error('initialStep is out of bounds')
	}
	const [ activeStepIndex, setActiveStepIndex ] = React.useState(initialStep || 0)
	return (
		<Box {...rest}>
			<Steps className="flow-steps" {...stepsProps}>
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
					return (
						<Step
							key={step.props.label}
							status={step.props.status}
							onClick={
								stepIndex === activeStepIndex
									? null
									: () => { return setActiveStepIndex(stepIndex) }
							}
						>
							{step.props.label}
						</Step>
					)
				})}
			</Steps>
			{React.cloneElement(children[activeStepIndex], {
				stepIndex: activeStepIndex
			})}
		</Box>
	)
}

StepsFlow.Step = FlowStep

export default StepsFlow
