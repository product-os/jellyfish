import React from 'react'
import {
	Flex
} from 'rendition'
import styled from 'styled-components'

const ColumnBase = styled(Flex).attrs({
	flexDirection: 'column',
	flex: '1'
}) `
	height: 100%;
	min-width: 270px;
`

export default (props) => {
	const {
		overflowY
	} = props

	const rest = _.omit(props, 'overflowY')

	const style = overflowY ? {
		overflowY: 'auto'
	} : {}

	return <ColumnBase {...rest} style={style} />
}
