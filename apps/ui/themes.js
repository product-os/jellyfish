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
		background: '#fff',
		border: '#eee'
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
		background: '#000',
		border: '#eee'
	}
}
