import React from 'react';
const TIME_RANGE_CHECK_TIMEOUT = 2000;

const isInUTCHourRange = (from, to, getCurrentHour) => {
	const now = getCurrentHour();
	return now >= from && now < to;
};

const defaultGetCurrentHour = () => {
	return new Date().getUTCHours();
};

/*
 * `from` and `to` parameters shall be in hours
 * `getCurrentHour` is for testing purposes
 */
export const useIsInUTCHourRange = (
	from,
	to,
	getCurrentHour = defaultGetCurrentHour,
) => {
	const initialIsInRange = isInUTCHourRange(from, to, getCurrentHour);
	const [isInRange, setIsInRange] = React.useState(initialIsInRange);

	React.useEffect(() => {
		let timeout: any = null;

		const check = () => {
			const newIsInRange = isInUTCHourRange(from, to, getCurrentHour);

			if (newIsInRange !== isInRange) {
				setIsInRange(newIsInRange);
			}

			timeout = setTimeout(check, TIME_RANGE_CHECK_TIMEOUT);
		};

		check();

		return () => {
			clearTimeout(timeout);
		};
	}, [from, to, isInRange]);

	return isInRange;
};
