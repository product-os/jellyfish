import React from 'react';
import { Select, SelectProps } from 'rendition';

type SortDirButtonProps = Omit<
	SelectProps<string>,
	'options' | 'labelKey' | 'valueKey'
>;

export const SortDirButton: React.FunctionComponent<SortDirButtonProps> = ({
	value,
	onChange,
	...rest
}) => {
	const options = React.useMemo(() => {
		return [
			{
				title: 'Asc by Date',
				value: 'asc',
			},
			{
				title: 'Desc by Date',
				value: 'desc',
			},
		];
	}, []);

	const objectValue = React.useMemo(() => {
		return {
			value,
		};
	}, [value]);

	const handleChange = React.useCallback(
		(eventArgs) => {
			onChange(eventArgs.value.value);
		},
		[onChange],
	);

	return (
		<Select
			{...rest}
			labelKey="title"
			valueKey="value"
			options={options}
			value={objectValue}
			onChange={handleChange}
		/>
	);
};
