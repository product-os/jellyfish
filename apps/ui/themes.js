/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	Theme
} from 'rendition'

export const lightTheme = {
	name: 'Light',
	data: {
		text: {
			main: Theme.colors.secondary.main,
			light: Theme.colors.secondary.light,
			dark: Theme.colors.secondary.dark
		},
		background: {
			main: '#fff'
		},
		border: {
			dark: '#CBCBCB',
			main: '#E2E2E2',
			light: '#F9F9F9',
			semilight: '#FFFFFF'
		}
	}
}

export const darkTheme = {
	name: 'Dark',
	data: {
		text: {
			main: Theme.colors.secondary.main,
			light: Theme.colors.secondary.light,
			dark: Theme.colors.secondary.dark
		},
		background: {
			main: '#000'
		},
		border: {
			dark: '#CBCBCB',
			main: '#E2E2E2',
			light: '#F9F9F9',
			semilight: '#FFFFFF'
		}
	}
}
