/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'

/**
 * React Hook to debounce a value by the specified time period.
 *
 * @example
 * const debouncedValue = useDebounce(myValue, 500)
 *
 * @param {Any} value - the value to debounce
 * @param {Number} delay - the number of milliseconds to wait before updating the debounced value
 *
 * @returns {Any} the debounced value
 */
export default function useDebounce (value, delay) {
	const [ debouncedValue, setDebouncedValue ] = React.useState(value)

	React.useEffect(
		() => {
			// Set debouncedValue to value (passed in) after the specified delay
			const handler = setTimeout(() => {
				setDebouncedValue(value)
			}, delay)

			// Prevent debouncedValue from changing if value is
			// changed within the delay period. Timeout gets cleared and restarted.
			return () => {
				clearTimeout(handler)
			}
		},
		[ value, delay ]
	)

	return debouncedValue
}
