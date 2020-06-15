/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const getComponentFromTrigger = async (trigger, tag, text) => {
	const [ matching ] = await trigger.dataProvider(`${tag}${text}`)
	const div = trigger.component({
		entity: matching
	})
	return div
}

const getOutputFromTrigger = async (trigger, tag, text) => {
	const [ matching ] = await trigger.dataProvider(`${tag}${text}`)
	return trigger.output(matching)
}

export {
	getComponentFromTrigger,
	getOutputFromTrigger
}
