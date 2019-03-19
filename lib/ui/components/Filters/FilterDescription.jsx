import * as _ from 'lodash'
import * as React from 'react'
import styled from 'styled-components'
import {
	DeleteButton,
	Box,
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

const FilterDescription = (props) => {
	return (
		<div>
			<ButtonWrapper onClick={props.edit ? props.edit : _.noop}>
				<Flex>
					<FilterDescriptionInner filter={props.filter} />
				</Flex>
			</ButtonWrapper>

			{Boolean(props.delete) && (
				<DeleteButton
					color={props.dark ? '#fff' : ''}
					onClick={props.delete}
				/>
			)}
		</div>
	)
}

export default FilterDescription
