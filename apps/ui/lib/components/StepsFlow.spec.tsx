/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { getWrapper } from '../../test/ui-setup';
import { mount, shallow } from 'enzyme';
import React from 'react';
import StepsFlow from './StepsFlow';

const wrappingComponent = getWrapper().wrapper;

const stepsProps = {
	title: 'Test flow',
};

const getStep = (index, stepStatus) => {
	return (
		<StepsFlow.Step key={index} label={`Step ${index}`} status={stepStatus}>
			<div className={`step${index}`}>Step {index}</div>
		</StepsFlow.Step>
	);
};

const getShallowStepsFlow = ({ status, ...props }) => {
	const stepStatus = status || 'pending';
	return shallow(
		<StepsFlow {...stepsProps} {...props}>
			{[1, 2, 3].map((index) => {
				return getStep(index, stepStatus);
			})}
		</StepsFlow>,
	);
};

const getMountedStepsFlow = ({ status, ...props }) => {
	const stepStatus = status || 'pending';
	return mount(
		<StepsFlow {...stepsProps} {...props}>
			{[1, 2, 3].map((index) => {
				return getStep(index, stepStatus);
			})}
		</StepsFlow>,
		{
			wrappingComponent,
		},
	);
};

describe('StepsFlow', () => {
	test('should render', () => {
		expect(() => {
			getShallowStepsFlow({} as any);
		}).not.toThrow();
	});

	test('initialStep is respected', () => {
		const component = getMountedStepsFlow({
			initialStep: 1,
		} as any);

		const stepHeading = component.find('h5[data-test="flow-step-1__heading"]');
		expect(stepHeading.text()).toBe('Step 2');
	});

	test('Previous button is disabled on first step', () => {
		const component = getMountedStepsFlow({
			status: 'completed',
		});

		let prevButton = component.find('button[data-test="steps-flow__prev-btn"]');
		expect(prevButton.prop('disabled')).toBe(true);

		const nextButton = component.find(
			'button[data-test="steps-flow__next-btn"]',
		);
		expect(nextButton.prop('disabled')).toBe(false);

		nextButton.simulate('click');

		prevButton = component.find('button[data-test="steps-flow__prev-btn"]');
		expect(prevButton.prop('disabled')).toBe(false);
	});

	test('Next button is disabled if step is not completed', () => {
		const component = getMountedStepsFlow({
			status: 'pending',
		});

		const nextButton = component.find(
			'button[data-test="steps-flow__next-btn"]',
		);
		expect(nextButton.prop('disabled')).toBe(true);
	});

	test('Action button is displayed on last step', () => {
		const component = getMountedStepsFlow({
			initialStep: 2,
		} as any);

		const actionButton = component.find(
			'button[data-test="steps-flow__action-btn"]',
		);
		expect(actionButton.prop('disabled')).toBe(true);

		const nextButton = component.find(
			'button[data-test="steps-flow__next-btn"]',
		);
		expect(nextButton.exists()).toBe(false);
	});

	test('Action button is enabled if all steps are completed', () => {
		const component = getMountedStepsFlow({
			initialStep: 2,
			status: 'completed',
		});

		const actionButton = component.find(
			'button[data-test="steps-flow__action-btn"]',
		);
		expect(actionButton.prop('disabled')).toBe(false);
	});

	test('initialStep cannot be greater than number of steps', () => {
		expect(() => {
			getShallowStepsFlow({
				initialStep: 3,
			} as any);
		}).toThrow();
	});

	test('Invalid child components are not allowed', () => {
		expect(() => {
			shallow(
				<StepsFlow initialStep={3} {...stepsProps}>
					<StepsFlow.Step label="Step 1" status="completed">
						<div className="step1">Step 1</div>
					</StepsFlow.Step>
					<div>Illegal!</div>
				</StepsFlow>,
			);
		}).toThrow();
	});

	test('Invalid status values are not allowed', () => {
		expect(() => {
			getShallowStepsFlow({
				status: 'foobar',
			});
		}).toThrow();
	});
});
