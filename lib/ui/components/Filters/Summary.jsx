import * as React from 'react'
import FaBookmarkO from 'react-icons/lib/fa/bookmark-o'
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

	handleChange (event) {
		const name = event.target.value
		this.setState({
			name
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
						cancel={() => {
							return this.setState({
								showForm: false
							})
						}}
						done={this.save}
						action="Save"
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
										onChange={(event) => {
											return this.setState({
												scope: event.target.value
											})
										}
										}
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
								value={this.state.name}
								placeholder="Enter a name for the view"
								onChange={(event) => {
									return this.handleChange(event)
								}}
								autoFocus
							/>
						</form>
					</Modal>
				)}
				<Flex justify="space-between">
					<Flex wrap>
						{this.props.filters.map((filter, index) => {
							return (
								<Box mb={10} mr={10} key={index}>
									<FilterDescription
										dark={this.props.dark}
										filter={filter}
										edit={() => { return this.props.edit(filter) }}
										delete={() => { return this.props.delete(filter) }}
									/>
								</Box>
							)
						})}
					</Flex>

					<Button
						primary
						plaintext
						fontSize={13}
						mt={-7}
						onClick={() => {
							return this.setState({
								showForm: !this.state.showForm
							})
						}}
					>
						<FaBookmarkO style={{
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
