/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Select
} from 'rendition'
import {
	withTheme
} from 'styled-components'

const SliceOptions = ({
	sliceOptions,
	activeSlice,
	setSlice
}) => {
	if (!sliceOptions || !sliceOptions.length > 1) {
		return null
	}
	return (
		<Select
			ml={3}
			options={sliceOptions}
			value={activeSlice}
			labelKey='title'
			onChange={setSlice}
		/>
	)
}

export default withTheme(SliceOptions)
