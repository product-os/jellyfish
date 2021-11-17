/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import { Select, SelectProps } from 'rendition';

export interface SliceOption {
	title: string;
	value: {
		path: string;
		value?: any;
	};
}

interface SliceOptionsSelectProps
	extends Omit<SelectProps<SliceOption>, 'options'> {
	sliceOptions: SliceOption[];
	activeSlice: SliceOption;
}

const SliceOptionsSelect = ({
	sliceOptions,
	activeSlice,
	...rest
}: SliceOptionsSelectProps) => {
	if (!sliceOptions || sliceOptions.length < 1) {
		return null;
	}
	return (
		<Select
			{...rest}
			options={sliceOptions}
			value={activeSlice}
			labelKey="title"
		/>
	);
};

export default SliceOptionsSelect;
