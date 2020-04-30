/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import clone from 'deep-copy'
import _ from 'lodash'
import React from 'react'
import styled from 'styled-components'
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

// TODO: This ui-components -> ui import should not happen
import Icon from './shame/Icon'

const FieldInputBox = styled(Box) `
	flex: 1;
`

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

				<Flex
					flexDirection={[ 'column', 'column', 'row' ]}
					justifyContent="space-between"
					alignItems={[ 'flex-start', 'flex-start', 'center' ]}
					flexWrap="wrap"
				>
					<Txt mr={2} minWidth={100}>Add a new field</Txt>

					<FieldInputBox
						mr={2}
						my={1}
					>
						<Input
							value={this.state.key}
							onChange={this.setFieldTitle}
							placeholder="Enter the field title"
							data-test="card-edit__free-field-name-input"
						/>
					</FieldInputBox>

					<Select
						mr={2}
						my={1}
						value={this.state.fieldType}
						onChange={this.setFieldType}
						options={this.dataTypes}
						labelKey="name"
					/>

					<Button
						my={1}
						success
						onClick={this.addField}
						icon={<Icon name="plus"/>}
						data-test="card-edit__add-free-field"
					>
						Add field
					</Button>
				</Flex>
			</Box>
		)
	}
}
