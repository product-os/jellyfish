/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
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
