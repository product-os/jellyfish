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

const AutoCompleteWidget = (props) => {
	const getTargets = async (value) => {
		const schema = {
			type: 'object',
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

	const selectedValue = props.value ? {
		value: props.value,
		label: props.value
	} : null

	const onChange = (option) => {
		props.onChange(option === null ? null : option.value)
	}

	const formatCreateLabel = (value) => {
		return `Use "${value}"`
	}

	return (
		<AsyncCreatableSelect
			classNamePrefix="jellyfish-async-select"
			value={selectedValue}
			isClearable
			cacheOptions
			onChange={onChange}
			loadOptions={getTargets}
			formatCreateLabel={formatCreateLabel}
		/>
	)
}

export default AutoCompleteWidget
