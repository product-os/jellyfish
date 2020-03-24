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
	Divider,
	Heading,
	Flex,
	Steps,
	Step
} from 'rendition'
import _ from 'lodash'
import styled from 'styled-components'
import Icon from './shame/Icon'

const VALID_STEP_STATUSES = {
	pending: true,
	completed: true,
	none: true
}

const FlowStepFlex = styled(Flex) `
	min-height: 0;
	overflow-y: ${(props) => { return props.scrollable ? 'auto' : 'unset' }};
`

const nonePending = (stepStatuses) => {
	return _.every(
		stepStatuses,
		(status) => { return status !== 'pending' }
	)
}

const StepsHeading = styled(Heading.h3) `
	line-height: 1;
`

const StepsBox = styled(Box) `
	.flow-steps {
		padding: ${(props) => { return props.theme.space[4] }}px;
	}
`

/**
 * Each StepsFlow.Step should define the following props:
 * - 'label' (to be used as the step label)
 * - 'title' (to be used as the title above the step content)
 * - 'status' ('pending', 'completed' or 'none')
 * - 'children' (the step content, to be displayed when the step is active)
 */
const FlowStep = ({
	stepIndex, label, title, status, children, ...rest
}) => {
	return (
		<FlowStepFlex pt={4} px={4} flex={1} alignSelf="stretch" {...rest} flexDirection="column">
			<Heading.h5 data-test={`flow-step-${stepIndex}__heading`} mb={2}>{title || label}</Heading.h5>
			{children}
		</FlowStepFlex>
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
	title,
	titleIcon,
	initialStep,
	onClose,
	onDone,
	stepsProps,
	children,
	action,
	...rest
}) => {
	// Ignore falsey children
	const steps = _.compact(children)
	if (initialStep > steps.length - 1 || initialStep < 0) {
		throw new Error('initialStep is out of bounds')
	}
	const [ activeStepIndex, setActiveStepIndex ] = React.useState(initialStep || 0)
	const [ busy, setBusy ] = React.useState(false)
	const onActionButtonClick = async () => {
		setBusy(true)
		await onDone()
		setBusy(false)
		setActiveStepIndex(initialStep || 0)
	}
	const stepStatuses = _.map(steps, 'props.status')
	const allComplete = nonePending(stepStatuses)
	return (
		<Flex py={4} {...rest} alignItems="flex-start" flex={1} flexDirection="column">
			<Flex alignItems="center" alignSelf="stretch" justifyContent="space-between" px={4}>
				{title && (
					<StepsHeading>
						{titleIcon && <Box display="inline-block" mr={2}><Icon name={titleIcon} /></Box>}
						{title}
					</StepsHeading>
				)}
				<Button plain p={2} icon={<Icon name="times" />} onClick={onClose} />
			</Flex>
			<StepsBox flex={0}>
				<Steps
					className="flow-steps"
					bordered={false}
					ordered
					activeStepIndex={activeStepIndex}
					{...stepsProps}
				>
					{React.Children.map(steps, (step, stepIndex) => {
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
								onClick={() => { return setActiveStepIndex(stepIndex) }}
							>
								{step.props.label}
							</Step>
						)
					})}
				</Steps>
			</StepsBox>
			<Divider m={0} />
			{React.cloneElement(steps[activeStepIndex], {
				stepIndex: activeStepIndex
			})}
			<Flex flex={0} px={4} mt={4} alignSelf="flex-end" alignItems="center" justifyContent="flex-end">
				<Button
					mr={3}
					data-test="steps-flow__prev-btn"
					disabled={activeStepIndex === 0}
					onClick={() => { return setActiveStepIndex(activeStepIndex - 1) }}
				>
					Previous
				</Button>
				{ activeStepIndex < steps.length - 1 && (
					<Button
						data-test="steps-flow__next-btn"
						disabled={steps[activeStepIndex].props.status === 'pending'}
						onClick={() => { return setActiveStepIndex(activeStepIndex + 1) }}
						primary
					>
						Next
					</Button>
				)}
				{ activeStepIndex === steps.length - 1 && (
					<Button
						icon={busy ? <Icon name="cog" spin /> : null }
						disabled={!allComplete || busy}
						data-test="steps-flow__action-btn"
						onClick={onActionButtonClick}
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
