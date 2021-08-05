/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import { Select } from 'rendition';

const SliceOptions = ({ sliceOptions, activeSlice, setSlice, ...rest }) => {
	if (!sliceOptions || sliceOptions.length < 1) {
		return null;
	}
	return (
		<Select
			{...rest}
			options={sliceOptions}
			value={activeSlice}
			labelKey="title"
			onChange={setSlice}
		/>
	);
};

export default SliceOptions;
