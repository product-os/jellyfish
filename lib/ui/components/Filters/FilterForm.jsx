import * as _ from 'lodash'
import * as React from 'react'
import {
	Flex,
	Select
} from 'rendition'
import {
	getDataModel
} from 'rendition/dist/components/DataTypes'

const FilterInput = (props) => {
	const Model = getDataModel(props.schema)

	if (!Model) {
		return null
	}

	return (
		<Model.Edit
			schema={props.schema}
			value={props.value}
			operator={props.operator}
			onUpdate={props.onChange}
			autoFocus
		/>
	)
}

const FilterForm = (props) => {
	const {
		handleEditChange,
		inputModels,
		name,
		value,
		operator,
		schema
	} = props
	const subSchema = (schema).properties[name]
	const Model = getDataModel(subSchema)

	if (!Model) {
		return null
	}

	return (
		<Flex>
			<Select
				mr={20}
				value={name}
				onChange={(event) => {
					return handleEditChange((event.target).value, 'name')
				}}
			>
				{_.map(inputModels, (model) => {
					return (
						<option key={model.name} value={model.name}>
							{model.label || model.name}
						</option>
					)
				})}
			</Select>
			<Select
				mr={20}
				value={operator}
				onChange={(event) => {
					return handleEditChange(event.target.value, 'operator')
				}}
			>
				{_.map(Model.operators, (item) => {
					return (
						<option value={item.value} key={item.value}>
							{item.label}
						</option>
					)
				})}
			</Select>
			<FilterInput
				operator={operator}
				schema={schema[name]}
				value={value}
				onChange={(data) => {
					return handleEditChange(data, 'value')
				}}
			/>
		</Flex>
	)
}

export default FilterForm
