/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

export const formatCurrency = (value, currency = 'USD', minimumFractionDigits = 0) => {
	if (!value) return ''
	return new Intl.NumberFormat('en-US', {
		style: 'currency', currency, minimumFractionDigits
	}).format(value)
}

export const formatDateLocal = (date) => {
	if (!date) return ''
	return new Intl.DateTimeFormat().format(date)
}
