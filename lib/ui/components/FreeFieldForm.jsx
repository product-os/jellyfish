/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import clone from 'deep-copy'
import _ from 'lodash'
import React from 'react'
import {
	Box,
	Button,
	Flex,
	Input,
	Select,
	Txt
} from 'rendition'
import {
	Form
} from 'rendition/dist/unstable'
import Icon from '../shame/Icon'

export default class FreeFieldForm extends React.Component {
	constructor (props) {
		super(props)

		this.dataTypes = [
			{
				key: 'string',
				name: 'String',
				schema: {
					type: 'string'
				}
			},
			{
				key: 'number',
				name: 'Number',
				schema: {
					type: 'number'
				}
			},
			{
				key: 'boolean',
				name: 'Boolean',
				schema: {
					type: 'boolean'
				}
			},
			{
				key: 'date',
				name: 'Date',
				schema: {
					type: 'string',
					format: 'date-time'
				}
			},
			{
				key: 'markdown',
				name: 'Rich text',
				schema: {
					type: 'string',
					format: 'markdown'
				}
			},
			{
				key: 'mermaid',
				name: 'Chart',
				schema: {
					type: 'string',
					format: 'mermaid'
				}
			}
		]

		this.state = {
			key: '',
			fieldType: _.first(this.dataTypes)
		}

		this.addField = this.addField.bind(this)
		this.handleFormChange = this.handleFormChange.bind(this)
		this.setFieldTitle = this.setFieldTitle.bind(this)
		this.setFieldType = this.setFieldType.bind(this)
	}

	addField () {
		const {
			key, fieldType
		} = this.state
		const schema = this.props.schema
		const subSchema = fieldType.schema

		_.set(schema, [ 'properties', key ], subSchema)

		this.setState({
			key: '',
			fieldType: _.first(this.dataTypes)
		})

		this.props.onSchemaChange(schema)
	}

	handleFormChange (data) {
		this.props.onDataChange(data.formData)
	}

	setFieldTitle (event) {
		this.setState({
			key: event.currentTarget.value
		})
	}

	setFieldType (field) {
		this.setState({
			fieldType: field.value
		})
	}

	render () {
		return (
			<Box>
				<Form
					schema={clone(this.props.schema)}
					value={this.props.data}
					onFormChange={this.handleFormChange}
					hideSubmitButton={true}
				/>

				<Flex justifyContent="space-between" pt={60}>
					<Txt mt={9}>Add a new field</Txt>

					<Input
						value={this.state.key}
						onChange={this.setFieldTitle}
						placeholder="Enter the field title"
					/>

					<Select
						value={this.state.fieldType}
						onChange={this.setFieldType}
						options={this.dataTypes}
						labelKey="name"
					/>

					<Button
						success
						onClick={this.addField}
						icon={<Icon name="plus"/>}
					>
						Add field
					</Button>
				</Flex>
			</Box>
		)
	}
}
