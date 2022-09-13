import React from 'react';
import {
	Menu,
	MenuItem,
	MenuButton,
	SubMenu,
	MenuDivider,
} from '@szhsin/react-menu';
import '@szhsin/react-menu/dist/index.css';
import '@szhsin/react-menu/dist/transitions/slide.css';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { selectors } from '../../store';
import { useSetup } from '../SetupProvider';
import { Icon } from '../../components';

const StyledMenuTitle = styled('div')`
	padding: 0.375rem 1.5rem;
	font-weight: bold;
`;

const StyledMenuItem = styled(MenuItem)`
	z-index: 100;
`;

const StyledMenuButton = styled(MenuButton)`
	min-height: 0;
	height: 28px;
	background: #8c31ff;
	border-color: #f7f2ff;
	border: 1px solid white;
	border-radius: 5px;
	color: white;
	padding-left: 16px;
	padding-right: 16px;
	text-align: center;
	text-decoration: none;
	display: inline-block;
	cursor: pointer;
`;

// A netsted menu component for selecting a loop and/or a product
export const LoopSelector = React.memo(() => {
	const history = useHistory();
	const { sdk } = useSetup()!;
	const user = useSelector(selectors.getCurrentUser());
	const [allLoopsAndProducts, setAllLoopsAndProducts] = React.useState<any[]>(
		[],
	);

	if (!user) {
		throw new Error('Cannot render without a user');
	}

	const orgs =
		user?.links?.['is member of'].map((org) => ({
			label: org.name,
			type: 'org',
			value: org.slug,
		})) ?? [];

	React.useEffect(() => {
		// get and sort all loops and all their products,
		// then prepare them to be options in react-select
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
				const loopsAndProdutOptions = loopsAndProducts
					.sort((loopA: any, loopB: any) =>
						loopA.label < loopB.label ? -1 : 1,
					)
					.map((loop) => ({
						label: loop.name,
						value: loop.slug,
						type: 'loop',
						icon: 'circle',
						products: loop?.links?.has
							?.map((product) => ({
								label: product.name,
								value: product.slug,
								type: 'product',
								icon: 'gem',
							}))
							.sort((productA: any, productB: any) =>
								productA.label < productB.label ? -1 : 1,
							),
					}));
				// .reduce((aggregator: any, item) => {
				// 	return [...aggregator, [{ ...item }], item.products];
				// }, []);
				setAllLoopsAndProducts(loopsAndProdutOptions);
			})
			.catch(console.error);
	}, []);

	const navigateTo = (e, value) => {
		// Maybe here we can also dispatch the active loop if useful
		// navigate
		history.push(`/${value}`);
	};

	const menuOption = (element, subMenu?) => {
		if (subMenu) {
			return (
				<>
					<SubMenu label={element.label}>
						<StyledMenuItem onClick={(e) => navigateTo(e, element.value)}>
							{element.label} {subMenu?.[0]?.type === 'loop' ? 'org' : 'loop'}
						</StyledMenuItem>
						<MenuDivider />
						<StyledMenuTitle>
							{subMenu?.[0]?.type === 'loop' ? 'Loops' : 'Products'}
						</StyledMenuTitle>
						{subMenu.map((loop) => menuOption(loop, loop.products))}
					</SubMenu>
				</>
			);
		} else {
			return (
				<StyledMenuItem onClick={(e) => navigateTo(e, element.value)}>
					{element.label}
				</StyledMenuItem>
			);
		}
	};

	// TODO: merging of orgs and allLoopsAndProduct won't work for multiple orgs
	return (
		// <>
		<Menu
			menuButton={
				<StyledMenuButton>
					Balena
					<Icon style={{ marginLeft: '1rem' }} name="chevron-down" />
				</StyledMenuButton>
			}
			transition
		>
			<StyledMenuTitle>Orgs</StyledMenuTitle>
			{orgs.map((org) => menuOption(org, allLoopsAndProducts))}
		</Menu>
		// </>
	);
});
