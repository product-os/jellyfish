/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const formatters = require('./formatters')

ava('.formatCurrency() defaults to USD, no unnecessary decimal places', (test) => {
	test.is(formatters.formatCurrency('12'), '$12')
})

ava('.formatCurrency() can accept a different currency', (test) => {
	test.is(formatters.formatCurrency('12', 'GBP'), '£12')
})

ava('.formatCurrency() can force two decimal places', (test) => {
	test.is(formatters.formatCurrency('12', 'USD', 2), '$12.00')
})

ava('.formatCurrency() returns an empty string if no value provided', (test) => {
	test.is(formatters.formatCurrency(), '')
})
