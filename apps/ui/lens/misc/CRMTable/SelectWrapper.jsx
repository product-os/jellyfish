/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	Select,
	Badge
} from 'rendition'
import styled from 'styled-components'
import withCardUpdater from '../../../../../lib/ui-components/HOC/with-card-updater'

const SingleLineSpan = styled.span `
	whiteSpace: 'nowrap'
`

const SelectWrapper = ({
	card, types, onUpdateCard
}) => {
	const setValue = ({
		option
	}) => {
		onUpdateCard(card, [ 'data', 'status' ], option)
	}

	const label = _.get(card, [ 'data', 'status' ])
	return (
		<Select
			options={types}
			onChange={setValue}
			value={
				<SingleLineSpan>
					<Badge shade={types.indexOf(label)} xsmall m={1}>{label}</Badge>
				</SingleLineSpan>
			}
		>
			{(option, index) => <Badge shade={index} xsmall m={1}>{option}</Badge>}
		</Select>
	)
}

export default withCardUpdater()(SelectWrapper)
