import React from 'react';
import _ from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import type { Contract, LoopContract } from 'autumndb';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { actionCreators, selectors } from '../../store';
import { useSetup } from '../SetupProvider';
import Select, { SelectProps } from 'react-select';

const StyledSelect = styled(Select)`
	margin-left: 16px;
`;

// A drop-down component for selecting a loop
export const LoopSelector = React.memo(() => {
	const loops = useSelector(selectors.getLoops());
	const history = useHistory();
	const stateActiveLoop = useSelector(selectors.getActiveLoop());
	const channels = useSelector(selectors.getChannels());
	const { sdk } = useSetup()!;
	const dispatch = useDispatch();
	const [products, setProducts] = React.useState<Contract[]>([]);
	const [activeLoop, setActiveLoop] = React.useState<LoopContract | null>(null);
	const [activeProduct, setActiveProduct] = React.useState<Contract | null>(
		null,
	);

	React.useEffect(() => {
		for (const channel of channels) {
			for (const loop of loops) {
				if (
					loop.id === channel.data.target ||
					loop.slug === channel.data.target
				) {
					return setActiveLoop(loop);
				}
			}
		}
		setActiveLoop(null);
		if (stateActiveLoop) {
			dispatch(actionCreators.setActiveLoop(null));
		}
	}, [channels]);

	React.useEffect(() => {
		for (const channel of channels) {
			for (const product of products) {
				if (
					product.id === channel.data.target ||
					product.slug === channel.data.target
				) {
					if (!activeLoop) {
						const linkedLoop = product?.links?.['is used by'][0]!;
						if (
							linkedLoop.id === channel.data.target ||
							linkedLoop.slug === channel.data.target
						) {
							setActiveLoop(linkedLoop);
						}
					}
					return setActiveProduct(product);
				}
			}
		}
		return setActiveProduct(null);
	}, [channels]);

	React.useEffect(() => {
		if (activeLoop) {
			sdk
				.query({
					type: 'object',
					properties: {
						type: {
							const: 'repository@1.0.0',
						},
					},
					$$links: {
						'is used by': {
							type: 'object',
							properties: {
								id: {
									const: activeLoop.id,
								},
							},
						},
					},
				})
				.then((result) => {
					setProducts(result);
				})
				.catch(console.error);
		} else {
			setProducts([]);
		}
	}, [activeLoop]);

	const onLoopChange = ({ value }) => {
		if (value) {
			history.push(`/${value.slug}`);
			dispatch(actionCreators.setActiveLoop(`${value.slug}@${value.version}`));
		} else {
			history.push('/');
			dispatch(actionCreators.setActiveLoop(null));
		}
	};

	const onProductChange = ({ value }) => {
		if (activeLoop) {
			if (value) {
				history.push(`/${activeLoop.slug}/${value.slug}`);
			} else {
				history.push(`/${activeLoop.slug}`);
			}
		}
	};

	const height = 28;
	const customStyles: SelectProps['styles'] = {
		valueContainer: (styles) => ({
			...styles,
			height,
			color: '#F7F2FF',
		}),
		indicatorsContainer: (styles) => ({
			...styles,
			height,
		}),
		control: (styles, { isFocused, hasValue }) => ({
			...styles,
			minHeight: 0,
			width: 180,
			background: isFocused ? 'white' : hasValue ? '#8369C4' : '#AF91E8',
			borderColor: hasValue ? '#8369C4' : '#F7F2FF',
		}),
		singleValue: (styles) => {
			return {
				...styles,
				color: '#F7F2FF',
			};
		},
		dropdownIndicator: (styles) => ({
			...styles,
			color: '#F7F2FF',
		}),
		placeholder: (styles) => ({
			...styles,
			color: '#F7F2FF',
		}),
	};

	return (
		<>
			<StyledSelect
				styles={customStyles}
				width="180px"
				ml={3}
				id="loopselector__select"
				blurInputOnSelect
				placeholder="Select loop..."
				value={
					activeLoop && {
						value: activeLoop,
						label: activeLoop.name,
					}
				}
				options={loops.map((option) => ({
					value: option,
					label: option.name,
				}))}
				onChange={onLoopChange}
			/>
			<StyledSelect
				styles={customStyles}
				width="180px"
				ml={2}
				id="productselector__select"
				placeholder="Select product..."
				blurInputOnSelect
				value={
					activeProduct && {
						value: activeProduct,
						label: activeProduct.name,
					}
				}
				options={products.map((option) => ({
					value: option,
					label: option.name,
				}))}
				labelKey="name"
				valueKey="slug"
				onChange={onProductChange}
			/>
		</>
	);
});
