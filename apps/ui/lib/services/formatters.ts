export const formatCurrency = (
	value?: number | bigint,
	currency = 'USD',
	minimumFractionDigits = 0,
) => {
	if (!value) {
		return '';
	}
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits,
	}).format(value);
};

export const formatDateLocal = (date: number | Date | undefined) => {
	if (!date) {
		return '';
	}
	return new Intl.DateTimeFormat().format(date);
};

// https://gist.github.com/thomseddon/3511330
export const formatSize = (bytes: number, base = 1000) => {
	if (typeof bytes !== 'number' || bytes < 0) {
		return null;
	}
	const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
	let order = Math.floor(Math.log(bytes) / Math.log(base));
	if (order >= units.length) {
		order = units.length - 1;
	}
	const size = bytes / Math.pow(base, order);
	let result: number | string | null = null;
	if (order < 0) {
		result = bytes;
		order = 0;
	} else if (order >= 3 && size !== Math.floor(size)) {
		result = size.toFixed(1);
	} else {
		result = size.toFixed();
	}
	return `${result} ${units[order]}`;
};

export const formatMb = (mb: number | null) => {
	if (mb === null) {
		return '-';
	}

	return formatSize(mb * 1024 * 1024, 1024) || '-';
};
