/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'

/**
 * React Hook to debounce a value by the specified time period.
 *
 * @example
 * const debouncedValue = useDebounce(myValue, 500)
 *
 * @param {Any} value - the value to debounce
 * @param {Number} delay - the number of milliseconds to wait before updating the debounced value
 * @param {Object} options - debounce options:
 *                             - lagOnFallingEdge (default: true)
 *                             - lagOnRisingEdge (default: true)
 *
 * @returns {Any} the debounced value
 */
export default function useDebounce (value, delay, options = {}) {
	const [ debouncedValue, setDebouncedValue ] = React.useState(value)
	const opts = _.defaults(options, {
		lagOnRisingEdge: true, lagOnFallingEdge: true
	})
	React.useEffect(
		() => {
			// Set debouncedValue to value (passed in) after the specified delay
			let handler = null
			if ((opts.lagOnRisingEdge && Boolean(value)) || (opts.lagOnFallingEdge && !value)) {
				handler = setTimeout(() => {
					setDebouncedValue(value)
				}, delay)
			} else {
				setDebouncedValue(value)
			}

			// Prevent debouncedValue from changing if value is
			// changed within the delay period. Timeout gets cleared and restarted.
			return () => {
				if (handler) {
					clearTimeout(handler)
				}
			}
		},
		[ value, delay ]
	)

	return debouncedValue
}
