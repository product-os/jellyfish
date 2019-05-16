/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React from 'react'
import AsyncCreatableSelect from 'react-select/lib/AsyncCreatable'
import {
	sdk
} from '../core'

const	formatCreateLabel = (value) => {
	return `Use "${value}"`
}

export default class AutoCompleteWidget extends React.Component {
	constructor (props) {
		super(props)

		this.getTargets = this.getTargets.bind(this)
		this.onChange = this.onChange.bind(this)
	}

	onChange (option) {
		this.props.onChange(option === null ? null : option.value)
	}

	async getTargets (value) {
		const {
			props
		} = this
		const schema = {
			type: 'object',
			description: `Find by pattern on type ${props.options.resource}`,
			properties: {
				active: {
					const: true
				},
				type: {
					const: props.options.resource
				},
				data: {
					type: 'object',
					properties: {
						repository: {
							regexp: {
								pattern: value,
								flags: 'i'
							}
						}
					},
					required: [ 'repository' ]
				}
			},
			required: [ 'type', 'data', 'active' ]
		}
		const schemaKeyPath = props.options.keyPath.split('.').join('.properties.')
		_.set(schemaKeyPath, {
			regexp: {
				pattern: value,
				flags: 'i'
			}
		})

		const results = await sdk.query(schema)

		return _.uniq(_.map(results, props.options.keyPath)).map((repo) => {
			return {
				value: repo,
				label: repo
			}
		})
	}

	render () {
		const {
			props
		} = this

		const selectedValue = props.value ? {
			value: props.value,
			label: props.value
		} : null

		return (
			<AsyncCreatableSelect
				classNamePrefix="jellyfish-async-select"
				value={selectedValue}
				isClearable
				cacheOptions
				onChange={this.onChange}
				loadOptions={this.getTargets}
				formatCreateLabel={formatCreateLabel}
			/>
		)
	}
}
