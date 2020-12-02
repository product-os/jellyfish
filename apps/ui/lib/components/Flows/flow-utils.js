/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

export const FLOW_IDS = {
	GUIDED_HANDOVER: 'guidedHandover',
	GUIDED_TEARDOWN: 'guidedTeardown'
}

/**
 * Coverts a boolean isComplete flag to a 'Steps'-compatible status text
 *
 * @param {Boolean} isComplete - true if the step is complete
 * @returns {String}
 */
export const stepStatus = (isComplete) => {
	return isComplete ? 'completed' : 'pending'
}

/**
 * Returns panel type based on component name
 *
 * @param {String} name - Name of component
 * @returns {String | null}
 */
export const getPanelType = (name) => {
	if (name === 'HandoverFlowPanel') {
		return FLOW_IDS.GUIDED_HANDOVER
	}

	if (name === 'TeardownFlowPanel') {
		return FLOW_IDS.GUIDED_TEARDOWN
	}

	return null
}
