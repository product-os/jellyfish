/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as React from 'react'
import {
	FaBookmark
} from 'react-icons/fa'
import {
	Button,
	Box,
	Flex,
	Input,
	Modal,
	Select,
	Txt
} from 'rendition'
import FilterDescription from './FilterDescription'

class FilterSummary extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			name: '',
			showForm: false,
			id: '',
			scope: this.props.scopes ? this.props.scopes[0].slug : null
		}

		this.toggleForm = () => {
			this.setState({
				showForm: !this.state.showForm
			})
		}

		this.cancel = this.cancel.bind(this)
		this.handleChange = this.handleChange.bind(this)
		this.save = this.save.bind(this)
	}

	save (event) {
		if (event) {
			event.preventDefault()
		}

		const {
			name, scope
		} = this.state

		if (!name) {
			return
		}

		this.props.saveView(name, scope)

		this.setState({
			name: '',
			showForm: false,
			id: ''
		})
	}

	cancel () {
		this.setState({
			showForm: false
		})
	}

	handleChange (event) {
		const name = event.target.value
		this.setState({
			name
		})
	}

	handleVisibleToChange (event) {
		this.setState({
			scope: event.target.value
		})
	}

	render () {
		const {
			scopes
		} = this.props

		return (
			<Box>
				{this.state.showForm && (
					<Modal
						title="Save current view"
						cancel={this.cancel}
						done={this.save}
						action="Save"
						primaryButtonProps={{
							'data-test': 'filters__save-view'
						}}
					>
						<form onSubmit={this.save}>
							{Boolean(scopes) && scopes.length > 1 && (
								<Flex mb={30}>
									<Txt width={90}>Visible to:</Txt>
									<Select
										ml={10}
										mt="-7px"
										width="auto"
										value={this.state.scope}
										onChange={this.handleVisibleToChange}
									>
										{scopes.map(({
											name, slug
										}) => {
											return (
												<option key={slug} value={slug}>
													{name}
												</option>
											)
										})}
									</Select>
								</Flex>
							)}

							<Input
								width="100%"
								data-test="filters__save-view-name"
								value={this.state.name}
								placeholder="Enter a name for the view"
								onChange={this.handleChange}
								autoFocus
							/>
						</form>
					</Modal>
				)}
				<Flex justifyContent="space-between">
					<Flex wrap>
						{this.props.filters.map((filter, index) => {
							return (
								<Box mb={10} mr={10} key={index}>
									<FilterDescription
										dark={this.props.dark}
										filter={filter}
										edit={this.props.edit}
										delete={this.props.delete}
									/>
								</Box>
							)
						})}
					</Flex>

					<Button
						primary
						plain
						fontSize={13}
						mt={-7}
						onClick={this.toggleForm}
						data-test="filters__open-save-view-modal"
					>
						<FaBookmark style={{
							marginRight: 6
						}} />
						Save view
					</Button>
				</Flex>
			</Box>
		)
	}
}

export default FilterSummary
