import React from 'react';
import { Select, SelectProps } from 'rendition';
import styled from 'styled-components';

const StyledSelect: any = styled(Select)`
	button {
		border: none;
	}
	min-width: 90px;
	input {
		padding-left: 4px;
	}
`;

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
		<StyledSelect
			{...rest}
			options={sliceOptions}
			value={activeSlice}
			labelKey="title"
		/>
	);
};

export default SliceOptionsSelect;
