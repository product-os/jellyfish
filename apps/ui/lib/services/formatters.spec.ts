import * as formatters from './formatters';

test('.formatCurrency() defaults to USD, no unnecessary decimal places', () => {
	expect(formatters.formatCurrency(12)).toBe('$12');
});

test('.formatCurrency() can accept a different currency', () => {
	expect(formatters.formatCurrency(12, 'GBP')).toBe('£12');
});

test('.formatCurrency() can force two decimal places', () => {
	expect(formatters.formatCurrency(12, 'USD', 2)).toBe('$12.00');
});

test('.formatCurrency() returns an empty string if no value provided', () => {
	expect(formatters.formatCurrency()).toBe('');
});

test('.formatSize() should return null when a negative number is provided', () => {
	expect(formatters.formatSize(-1)).toBe(null);
});

test('.formatSize() should correctly format 0 bytes', () => {
	expect(formatters.formatSize(0)).toBe('0 bytes');
});

test('.formatSize() should correctly format bytes', () => {
	expect(formatters.formatSize(102)).toBe('102 bytes');
});

test('.formatSize() should correctly format KB', () => {
	expect(formatters.formatSize(1536)).toBe('2 KB');
});

test('.formatSize() should correctly format MB', () => {
	expect(formatters.formatSize(3000000)).toBe('3 MB');
});

test('.formatSize() should correctly format GB', () => {
	expect(formatters.formatSize(1800000000)).toBe('1.8 GB');
});

test('.formatSize() should correctly format TB', () => {
	expect(formatters.formatSize(1800000000000)).toBe('1.8 TB');
});

test('.formatSize() should correctly format PB', () => {
	expect(formatters.formatSize(3500000000000000)).toBe('3.5 PB');
});

test(".formatMb() should return '-' when null is provided", () => {
	expect(formatters.formatMb(null)).toBe('-');
});

test('.formatMb() should correctly format MB', () => {
	expect(formatters.formatMb(3.1)).toBe('3 MB');
});
