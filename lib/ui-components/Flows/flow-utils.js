/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

export const FLOW_IDS = {
	GUIDED_HANDOVER: 'guidedHandover'
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
