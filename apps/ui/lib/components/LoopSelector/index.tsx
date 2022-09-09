import React from 'react';
import _ from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import type { Contract, contracts, LoopContract, OrgContract } from 'autumndb';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { actionCreators, selectors } from '../../store';
import { useSetup } from '../SetupProvider';
import Select, { SelectProps, components } from 'react-select';
import { Icon } from '../../components';

const StyledSelect = styled(Select)`
	margin-left: 16px;
`;

// A drop-down component for selecting a loop
export const LoopSelector = React.memo(() => {
	const history = useHistory();
	const { sdk } = useSetup()!;
	const dispatch = useDispatch();
	const user = useSelector(selectors.getCurrentUser());
	const loops = useSelector(selectors.getLoops());
	const stateActiveLoop = useSelector(selectors.getActiveLoop());
	const channels = useSelector(selectors.getChannels());
	const [allLoopsAndProducts, setAllLoopsAndProducts] = React.useState<
		Contract[]
	>([]);

	if (!user) {
		throw new Error('Cannot render without a user');
	}

	const orgs =
		user?.links?.['is member of'].map((org) => ({
			label: org.name,
			type: 'org',
			value: org.slug,
			icon: 'building',
		})) ?? [];

	React.useEffect(() => {
		sdk
			.query({
				type: 'object',
				properties: {
					type: {
						const: 'loop@1.0.0',
					},
				},
				$$links: {
					has: {
						type: 'object',
						properties: {
							type: {
								const: 'repository@1.0.0',
							},
						},
					},
				},
			})
			.then((loopsAndProducts) => {
				const landp = loopsAndProducts
					.map((loop) => ({
						label: loop.name,
						value: loop.slug,
						type: 'loop',
						icon: 'circle',
						products: loop?.links?.has
							?.map((product) => ({
								label: product.name,
								value: product.slug,
								icon: 'gem',
							}))
							.sort((productA: any, productB: any) =>
								productA.label < productB.label ? -1 : 1,
							),
					}))
					.reduce((aggregator: any, item) => {
						return [...aggregator, [{ ...item }], item.products];
					}, [])
					.flat();
				setAllLoopsAndProducts(landp);
			})
			.catch(console.error);
	}, []);

	const onNavigationChange = React.useCallback(({ value, type }) => {
		// TODO: set active loop ? Not sure if it's necessary

		// navigate
		history.push(`/${value}`);
	}, []);

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
			background: isFocused ? 'white' : hasValue ? '#3E0070' : '#8C31FF',
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

	const selectOptionStyleFor = (type) => {
		switch (type) {
			case 'loop':
				return {
					fontSize: '1.1em',
					fontWeight: 'bold',
				};
			case 'org':
				return {
					fontSize: '1.3em',
					fontWeight: 'bold',
				};
			case 'product':
				return {};
		}
	};

	const selectOption = (props) => (
		<components.Option {...props}>
			<span style={selectOptionStyleFor(props.data.type)}>
				<Icon name={props.data.icon} regular style={{ float: 'right' }} />{' '}
				<span>{props.data.label}</span>
			</span>
		</components.Option>
	);

	return (
		<>
			<StyledSelect
				styles={customStyles}
				width="180px"
				ml={3}
				className="nav-selector"
				id="orgselector__select"
				blurInputOnSelect
				placeholder="Navigate..."
				components={{ Option: selectOption }}
				options={[...orgs, ...allLoopsAndProducts]}
				onChange={onNavigationChange}
			/>
		</>
	);
});
