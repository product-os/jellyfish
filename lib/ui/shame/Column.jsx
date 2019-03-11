import styled from 'styled-components'
import {
	Flex
} from 'rendition'

export default styled(Flex).attrs({
	flexDirection: 'column'
}) `
	height: 100%;
	${(props) => {
		return props.overflowY ? 'overflow-y: auto;' : ''
	}}
	min-width: 270px;
`
