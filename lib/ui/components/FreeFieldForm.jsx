/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const clone = require('deep-copy')
const _ = require('lodash')
const React = require('react')
const rendition = require('rendition')
const unstable = require('rendition/dist/unstable')
const Icon = require('../shame/Icon')
class FreeFieldForm extends React.Component {
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
		this.setFieldTitle = (event) => {
			this.setState({
				key: event.currentTarget.value
			})
		}
		this.setFieldType = (event) => {
			this.setState({
				fieldType: event.currentTarget.value
			})
		}
		this.addField = () => {
			const {
				key, fieldType
			} = this.state
			const schema = this.props.schema
			const subSchema = _.find(this.dataTypes, {
				key: fieldType
			}).schema
			_.set(schema, [ 'properties', key ], subSchema)
			this.setState({
				key: '',
				fieldType: _.first(this.dataTypes).key
			})
			this.props.onSchemaChange(schema)
		}
		this.handleFormChange = (data) => {
			this.props.onDataChange(data.formData)
		}
		this.state = {
			key: '',
			fieldType: _.first(this.dataTypes).key
		}
	}
	render () {
		return (
			<rendition.Box>
				<unstable.Form
					schema={clone(this.props.schema)}
					value={this.props.data}
					onFormChange={this.handleFormChange}
					hideSubmitButton={true}
				/>

				<rendition.Flex justify="space-between" pt={60}>
					<rendition.Txt mt={9}>Add a new field</rendition.Txt>

					<rendition.Input value={this.state.key} onChange={this.setFieldTitle} placeholder="Enter the field title"/>

					<rendition.Select value={this.state.fieldType} onChange={this.setFieldType}>
						{this.dataTypes.map((item) => {
							return (<option key={item.key} value={item.key}>
								{item.name}
							</option>)
						})}
					</rendition.Select>

					<rendition.Button success onClick={this.addField}>
						<Icon.default style={{
							marginRight: 10
						}} name="plus"/>
							Add field
					</rendition.Button>
				</rendition.Flex>
			</rendition.Box>
		)
	}
}
exports.FreeFieldForm = FreeFieldForm
