/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React from 'react'
import AsyncCreatableSelect from 'react-select/async-creatable'
import {
	withSetup
} from './SetupProvider'

const	formatCreateLabel = (value) => {
	return `Use "${value}"`
}

// TODO: Make this an SDK method
// Generates a schema that will pattern match a field on a specific card type
const generateKeyPathQuerySchema = (keyPath, resource, value) => {
	// If the type isn't versioned, default to 1.0.0
	const type = resource.match('@') ? resource : `${resource}@1.0.0`

	const schema = {
		type: 'object',
		description: `Find by pattern on type ${type}`,
		properties: {
			active: {
				const: true
			},
			type: {
				const: type
			}
		},
		required: [ 'type', 'active' ]
	}

	const keyPathParts = keyPath.split('.')

	// Set a case insensitive pattern match schema at the location specified in
	// the keypath
	const schemaKeyPath = `properties.${keyPathParts.join('.properties.')}`
	_.set(schema, schemaKeyPath, {
		regexp: {
			pattern: value,
			flags: 'i'
		}
	})

	// Ensure that each subfield in the schema is marked as required
	let node = schema

	for (const key of keyPathParts) {
		if (!node.required) {
			node.required = []
		}

		node.required.push(key)

		node = node.properties[key]
	}

	return schema
}

class AutoCompleteWidget extends React.Component {
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

		const schema = generateKeyPathQuerySchema(props.options.keyPath, props.options.resource, value)

		const results = await props.sdk.query(schema)

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

export default withSetup(AutoCompleteWidget)
