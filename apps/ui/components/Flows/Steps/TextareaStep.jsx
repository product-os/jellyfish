/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Textarea
} from 'rendition'
import useDebounce from '../../../../../lib/ui-components/hooks/use-debounce'

// In this step you specify a text value for the flow.
export default function TextareaStep ({
	flowStatePropName,
	flowState,
	setFlow,
	...rest
}) {
	const [ value, setValue ] = React.useState(flowState[flowStatePropName] || '')
	const debouncedValue = useDebounce(value, 500)

	// If the flowStatePropName changes, update/reset the value based on the new flowStatePropName
	React.useEffect(() => {
		setValue(flowState[flowStatePropName] || '')
	}, [ flowStatePropName ])

	React.useEffect(() => {
		setFlow({
			[flowStatePropName]: debouncedValue
		})
	}, [ debouncedValue ])

	const updateValue = (event) => {
		setValue(event.target.value)
	}

	return (
		<Textarea
			data-test={`gf__ta-${flowStatePropName}`}
			minRows={4}
			{...rest}
			value={value}
			onChange={updateValue}
		/>
	)
}
