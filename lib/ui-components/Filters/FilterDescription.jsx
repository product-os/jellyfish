import * as React from 'react'
import styled from 'styled-components'
import FaClose from 'react-icons/lib/fa/close'
import {
	Box,
	Button,
	Flex
} from 'rendition'

const ButtonWrapper = styled.button `
	font-size: 13px;
	min-height: 22px;
	border: 0;
	border-radius: 3px;
	background-color: #e9e9e9;
	padding: 3px 8px;
`

const WrappingEm = styled.em `
	white-space: pre-wrap;
`

const DeleteButton = styled(Button) `
	color: rgba(0, 0, 0, 0.4);
`

const FilterDescriptionInner = (props) => {
	return (
		<Box>
			{Boolean(props.filter.anyOf) &&
			props.filter.anyOf.map((subschema, index) => {
				return (
					<React.Fragment key={index}>
						{index > 0 && <WrappingEm> or </WrappingEm>}
						<span>{subschema.description}</span>
					</React.Fragment>
				)
			})}
			{!props.filter.anyOf && <span>{props.filter.description}</span>}
		</Box>
	)
}

class FilterDescription extends React.Component {
	constructor (props) {
		super(props)

		this.edit = this.edit.bind(this)
		this.delete = this.delete.bind(this)
	}

	edit () {
		if (this.props.edit) {
			this.props.edit(this.props.filter)
		}
	}

	delete () {
		this.props.delete(this.props.filter)
	}

	render () {
		const {
			props
		} = this

		return (
			<div>
				<ButtonWrapper onClick={this.edit}>
					<Flex>
						<FilterDescriptionInner filter={props.filter} />
					</Flex>
				</ButtonWrapper>

				{Boolean(props.delete) && (
					<DeleteButton
						plain
						p={1}
						fontSize={1}
						ml={1}
						color={props.dark ? '#fff' : ''}
						onClick={this.delete}
					>
						<FaClose />
					</DeleteButton>
				)}
			</div>
		)
	}
}

export default FilterDescription
