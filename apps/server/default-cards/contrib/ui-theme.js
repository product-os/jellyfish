/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const COLOR_PATTERN = '^(#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}))|transparent$'

const colorProp = (title) => {
	return {
		type: 'string',
		title,
		pattern: COLOR_PATTERN
	}
}

const colorSet = (name) => {
	return {
		type: 'object',
		required: [ 'main', 'light', 'dark' ],
		properties: {
			main: colorProp(`${name} - main`),
			semilight: colorProp(`${name} - semilight`),
			light: colorProp(`${name} - light`),
			dark: colorProp(`${name} - dark`)
		}
	}
}

module.exports = {
	slug: 'ui-theme',
	type: 'type@1.0.0',
	name: 'UI Theme',
	data: {
		schema: {
			type: 'object',
			properties: {
				version: {
					type: 'string',
					default: '1.0.0',
					const: '1.0.0'
				},
				name: {
					type: 'string',
					fullTextSearch: true
				},
				data: {
					type: 'object',
					properties: {
						description: {
							type: 'string',
							fullTextSearch: true
						},
						screenshots: {
							type: 'array',
							items: {
								type: 'object',
								required: [ 'name', 'url' ],
								properties: {
									name: {
										type: 'string'
									},
									url: {
										type: 'string',
										format: 'uri'
									}
								}
							}
						},
						background: colorSet('background'),
						primary: colorSet('primary'),
						secondary: colorSet('secondary'),
						tertiary: colorSet('tertiary'),
						quartenary: colorSet('quartenary'),
						danger: colorSet('danger'),
						warning: colorSet('warning'),
						success: colorSet('success'),
						info: colorSet('info'),
						text: colorSet('text'),
						gray: colorSet('gray')
					},
					required: [
						'background',
						'primary',
						'secondary',
						'tertiary',
						'quartenary',
						'danger',
						'warning',
						'success',
						'info',
						'text',
						'gray'
					]
				}
			},
			required: [
				'version',
				'name',
				'data'
			]
		},
		uiSchema: {
			edit: {
				data: {
					'ui:order': [
						'description',
						'background',
						'primary',
						'secondary',
						'tertiary',
						'quartenary',
						'danger',
						'warning',
						'success',
						'info',
						'text',
						'gray',
						'screenshots'
					]
				}
			},
			create: {
				$ref: '#/data/uiSchema/edit'
			},
			fields: {
				data: {
					'ui:order': [
						'description',
						'screenshots',
						'background',
						'primary',
						'secondary',
						'tertiary',
						'quartenary',
						'danger',
						'warning',
						'success',
						'info',
						'text',
						'gray'
					]
				},
				description: {
					'ui:title': null
				},
				screenshots: {
					items: {
						'ui:order': [ 'name', 'url' ],
						name: {
							'ui:title': null
						},
						url: {
							'ui:widget': 'Img',
							'ui:options': {
								width: 400,
								alt: 'Screenshot'
							}
						}
					}
				}
			}
		}
	}
}
