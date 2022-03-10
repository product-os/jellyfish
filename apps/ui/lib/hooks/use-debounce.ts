import React from 'react';
import defaults from 'lodash/defaults';

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
export default function useDebounce<TValue>(
	value: TValue,
	delay: number,
	options = {},
) {
	const [debouncedValue, setDebouncedValue] = React.useState(value);
	const opts = defaults(options, {
		lagOnRisingEdge: true,
		lagOnFallingEdge: true,
	});
	React.useEffect(() => {
		// Set debouncedValue to value (passed in) after the specified delay
		let handler: number | null = null;
		if (
			(opts.lagOnRisingEdge && Boolean(value)) ||
			(opts.lagOnFallingEdge && !value)
		) {
			// TS-TODO: `setTimeout` returns `NodeJS.Timeout`
			handler = (setTimeout as any)(() => {
				setDebouncedValue(value);
			}, delay);
		} else {
			setDebouncedValue(value);
		}

		// Prevent debouncedValue from changing if value is
		// changed within the delay period. Timeout gets cleared and restarted.
		return () => {
			if (handler) {
				clearTimeout(handler);
			}
		};
	}, [value, delay]);

	return debouncedValue;
}
