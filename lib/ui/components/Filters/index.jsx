/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import clone from 'deep-copy'
import * as _ from 'lodash'
import * as React from 'react'
import FaFilter from 'react-icons/lib/fa/filter'
import FaClose from 'react-icons/lib/fa/close'
import {
	Button,
	Box,
	Flex,
	Modal,
	Search,
	Select,
	Txt,
	SchemaSieve
} from 'rendition'
import styled from 'styled-components'
import * as utils from 'rendition/dist/utils'
import {
	getDataModel
} from 'rendition/dist/components/DataTypes'
import Summary from './Summary'
import ViewsMenu from './ViewsMenu'
const {
	castArray,
	findIndex,
	includes,
	isEmpty,
	isEqual,
	map,
	reject
} = _

const flattenViews = (views) => {
	return views.map(({
		filters, ...view
	}) => {
		return {
			...view,
			filters: filters.map((filter) => { return SchemaSieve.flattenSchema(filter) })
		}
	})
}

const FilterInput = (props) => {
	const model = getDataModel(props.schema)

	if (!model) {
		return null
	}

	const Edit = model.Edit

	return (
		<Edit
			schema={props.schema}
			value={props.value}
			operator={props.operator}
			onUpdate={props.onUpdate}
			slim
		/>
	)
}

const RelativeBox = styled(Box) `
	position: relative;
`

const DeleteButton = styled(Button) `
	color: rgba(0, 0, 0, 0.4);
	position: absolute;
	bottom: 7px;
	right: -35px;
`

const SearchWrapper = styled.div `
	flex-basis: 500px;
`

const FilterWrapper = styled(Box) `
	position: relative;
`

class Filters extends React.Component {
	constructor (props) {
		super(props)
		const {
			filters = [], schema, views = []
		} = this.props

		const flatSchema = SchemaSieve.flattenSchema(schema)
		const flatViews = flattenViews(views)
		const flatFilters = filters.map((filter) => {
			return SchemaSieve.flattenSchema(filter)
		})

		this.state = {
			showModal: false,
			searchString: '',
			editingFilter: null,
			filters: flatFilters,
			views: flatViews,
			schema: flatSchema,
			edit: []
		}

		this.state.edit.push(this.getCleanEditModel())
	}

	componentWillReceiveProps (nextProps) {
		const newState = {}

		// If the schema prop updates, also update the internal 'flat' schema
		if (!isEqual(nextProps.schema, this.props.schema)) {
			newState.schema = SchemaSieve.flattenSchema(nextProps.schema)
		}

		if (!isEqual(nextProps.filters, this.props.filters)) {
			const filters = nextProps.filters || []
			newState.filters = filters.map((filter) => {
				return SchemaSieve.flattenSchema(filter)
			})
		}

		if (!isEqual(nextProps.views, this.props.views)) {
			const views = nextProps.views || []
			newState.views = flattenViews(views)
		}

		if (!isEmpty(newState)) {
			this.setState(newState)
		}
	}

	emitViewsUpdate () {
		if (!this.props.onViewsUpdate) {
			return
		}

		this.props.onViewsUpdate(
			this.state.views.map(({
				filters, ...view
			}) => {
				return {
					...view,
					filters: filters.map((filter) => { return SchemaSieve.unflattenSchema(filter) })
				}
			})
		)
	}

	getCleanEditModel (item) {
		const schema = this.state.schema
		let field = item
		if (!field) {
			field = Object.keys(schema.properties).shift()
		}

		const fieldOperators = this.getOperators(field)
		if (!fieldOperators.length) {
			return {
				field,
				operator: '',
				value: ''
			}
		}

		const operator = fieldOperators.shift().slug

		let value = ''
		const subschema = schema.properties[field]
		if (typeof subschema !== 'boolean') {
			if (subschema.enum) {
				value = subschema.enum[0] || ''
			}

			if (subschema.type === 'boolean') {
				value = true
			}
		}

		return {
			field,
			operator,
			value
		}
	}

	getOperators (field) {
		const schema = this.state.schema
		return SchemaSieve.getOperators(schema, field)
	}

	setEditField (field, index) {
		const currentEdit = this.state.edit.slice()
		currentEdit.splice(index, 1, this.getCleanEditModel(field))
		this.setState({
			edit: currentEdit
		})
	}

	setEditOperator (operator, index) {
		const currentEdit = this.state.edit.slice()
		const item = currentEdit[index]
		currentEdit.splice(index, 1, {
			...item, operator
		})
		this.setState({
			edit: currentEdit
		})
	}

	setEditValue (value, index) {
		const currentEdit = this.state.edit.slice()
		const item = currentEdit[index]
		currentEdit.splice(index, 1, {
			...item, value
		})
		this.setState({
			edit: currentEdit
		})
	}

	emitFilterUpdate () {
		if (!this.props.onFiltersUpdate) {
			return
		}

		this.props.onFiltersUpdate(
			this.state.filters.map((filter) => { return SchemaSieve.unflattenSchema(filter) })
		)
	}

	addFilter () {
		const $id = this.state.editingFilter
		const {
			schema
		} = this.state
		const filter = SchemaSieve.createFilter(schema, this.state.edit)
		const currentFilters = this.state.filters

		let filters = []

		if ($id) {
			const matchIndex = findIndex(currentFilters, {
				$id
			})
			currentFilters.splice(matchIndex, 1, filter)
			filters = currentFilters.slice()
		} else {
			filters = currentFilters.concat(filter)
		}

		this.setState(
			{
				filters,
				edit: [ this.getCleanEditModel() ],
				showModal: false,
				editingFilter: null
			},
			() => { return this.emitFilterUpdate() }
		)
	}

	editFilter (filter) {
		const {
			schema
		} = this.state

		const signatures = SchemaSieve.decodeFilter(schema, filter)

		this.setState({
			edit: signatures,
			editingFilter: filter.$id,
			showModal: true
		})
	}

	removeFilter ({
		$id, title
	}) {
		this.setState(
			(prevState) => {
				const newState = {
					...prevState,
					filters: reject(prevState.filters, {
						$id
					})
				}

				if (title === SchemaSieve.FULL_TEXT_SLUG) {
					newState.searchString = ''
				}

				return newState
			},
			() => { return this.emitFilterUpdate() }
		)
	}

	setFilters (filters) {
		this.setState({
			filters
		}, () => { return this.emitFilterUpdate() })
	}

	addCompound () {
		this.setState((prevState) => {
			return {
				edit: prevState.edit.concat(this.getCleanEditModel())
			}
		})
	}

	removeCompound (index) {
		const edit = this.state.edit.slice()
		edit.splice(index, 1)
		this.setState({
			edit
		})
	}

	saveView (name, scope) {
		const view = {
			id: utils.randomString(),
			name,
			scope,
			filters: clone(this.state.filters)
		}

		this.setState(
			(prevState) => {
				return {
					views: prevState.views.concat(view)
				}
			},
			() => { return this.props.onViewsUpdate && this.props.onViewsUpdate(this.state.views) }
		)
	}

	deleteView ({
		id
	}) {
		this.setState(
			(prevState) => {
				return {
					views: reject(prevState.views, {
						id
					})
				}
			},
			() => { return this.props.onViewsUpdate && this.props.onViewsUpdate(this.state.views) }
		)
	}

	setSimpleSearch (term) {
		this.setState(
			(prevState) => {
				const newFilters = term
					? SchemaSieve.upsertFullTextSearch(
						this.state.schema,
						prevState.filters,
						term
					)
					: SchemaSieve.removeFullTextSearch(prevState.filters)

				return {
					searchString: term,
					filters: newFilters
				}
			},
			() => { return this.emitFilterUpdate() }
		)
	}

	shouldRenderComponent (mode) {
		// If a render mode is not specified, render all components
		if (!this.props.renderMode) {
			return true
		}

		const allowedModes = castArray(this.props.renderMode)

		if (includes(allowedModes, 'all')) {
			return true
		}

		return includes(allowedModes, mode)
	}

	render () {
		const {
			filters
		} = this.state

		return (
			<FilterWrapper mb={3}>
				<Flex justifyContent="space-between">
					{this.shouldRenderComponent('add') && (
						<Button
							mr={30}
							disabled={this.props.disabled}
							primary
							onClick={() => {
								return this.setState({
									showModal: true, editingFilter: null
								})
							}
							}
							icon={<FaFilter />}
							{...this.props.addFilterButtonProps}
						/>
					)}

					{this.shouldRenderComponent('search') && (
						<SearchWrapper>
							<Search
								dark={this.props.dark}
								disabled={this.props.disabled}
								value={this.state.searchString}
								onChange={(event) => {
									return this.setSimpleSearch(event.target.value)
								}}
							/>
						</SearchWrapper>
					)}

					{this.shouldRenderComponent('views') && (
						<ViewsMenu
							buttonProps={this.props.viewsMenuButtonProps}
							disabled={this.props.disabled}
							views={this.state.views || []}
							schema={this.props.schema}
							hasMultipleScopes={
								this.props.viewScopes && this.props.viewScopes.length > 1
							}
							setFilters={(values) => { return this.setFilters(values) }}
							deleteView={(view) => { return this.deleteView(view) }}
							renderMode={this.props.renderMode}
						/>
					)}
				</Flex>

				{this.state.showModal && (
					<div>
						<Modal
							title="Filter by"
							cancel={() => {
								return this.setState({
									showModal: false
								})
							}}
							done={() => { return this.addFilter() }}
							action="Save"
						>
							{map(this.state.edit, ({
								field, operator, value
							}, index) => {
								const operators = this.getOperators(field)

								return (
									<RelativeBox key={index}>
										{index > 0 && <Txt my={2}>OR</Txt>}
										<Flex>
											<Select
												value={field}
												onChange={(event) => {
													return this.setEditField(event.target.value, index)
												}}
											>
												{map(
													this.state.schema.properties,
													(subschema, key) => {
														return (
															<option key={key} value={key}>
																{subschema.title || key}
															</option>
														)
													}
												)}
											</Select>

											{operators.length === 1 && (
												<Txt mx={1} p="7px 20px 0">
													{operators[0].label}
												</Txt>
											)}

											{operators.length > 1 && (
												<Select
													ml={1}
													value={operator}
													onChange={(event) => {
														return this.setEditOperator(event.target.value, index)
													}}
												>
													{map(operators, ({
														slug, label
													}) => {
														return (
															<option key={slug} value={slug}>
																{label}
															</option>
														)
													})}
												</Select>
											)}

											<FilterInput
												operator={operator}
												value={value}
												schema={
													this.state.schema.properties[field]
												}
												onUpdate={(event) => {
													return this.setEditValue(event, index)
												}}
											/>
										</Flex>
										{index > 0 && (
											<DeleteButton
												plain
												fontSize={1}
												p={1}
												onClick={() => {
													this.removeCompound(index)
												}}
											>
												<FaClose />
											</DeleteButton>
										)}
									</RelativeBox>
								)
							})}
							<Button
								mb={2}
								mt={4}
								primary
								underline
								onClick={() => { return this.addCompound() }}
							>
								Add alternative
							</Button>
						</Modal>
					</div>
				)}

				{this.shouldRenderComponent('summary') &&
					Boolean(filters.length) &&
					!this.props.disabled && (
					<Summary
						scopes={this.props.viewScopes}
						edit={(filter) => { return this.editFilter(filter) }}
						delete={(filter) => { return this.removeFilter(filter) }}
						saveView={(name, scope) => { return this.saveView(name, scope) }}
						filters={filters}
						views={this.state.views || []}
						schema={this.state.schema}
						dark={Boolean(this.props.dark)}
					/>
				)}
			</FilterWrapper>
		)
	}
}

export default Filters
