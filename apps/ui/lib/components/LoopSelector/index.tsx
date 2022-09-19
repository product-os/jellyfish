import React from 'react';
import {
	Menu,
	MenuItem,
	MenuButton,
	SubMenu,
	MenuDivider,
} from '@szhsin/react-menu';
import { menuItemSelector } from '@szhsin/react-menu/style-utils';
import '@szhsin/react-menu/dist/index.css';
import '@szhsin/react-menu/dist/transitions/slide.css';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { selectors } from '../../store';
import { useSetup } from '../SetupProvider';
import { Icon } from '../../components';
// import type { Contract, LoopContract, OrgContract } from 'autumndb';

const StyledMenu = styled(Menu)`
	${menuItemSelector.hover} {
		color: #000;
	}
`;

const StyledMenuTitle = styled('div')`
	padding: 0.375rem 1.5rem;
	font-weight: bold;
`;

const StyledMenuItem = styled(MenuItem)`
	background: ${(props) =>
		props.active
			? '#8c31ff'
			: props.isOrgLoop
			? 'rgba(140, 49, 255, 0.1)'
			: '#ffffff'};
	color: ${(props) => (props.active ? '#ffffff' : '#000000')};
	z-index: 100;
	position: relative;
`;

const StyledSubMenu = styled(SubMenu)`
	background: ${(props) => (props.active ? '#8c31ff' : '#ffffff')};
	color: ${(props) => (props.active ? '#ffffff' : '#000000')};
	z-index: 100;
	position: relative;
`;

const StyledMenuButton = styled(MenuButton)`
	color: white;
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
	const [activeOrg, setActiveOrg] = React.useState<string>('balena');
	const [activeLoop, setActiveLoop] = React.useState<string | null>(null);
	const [activeProduct, setActiveProduct] = React.useState<string | null>(null);
	const channels = useSelector(selectors.getChannels());

	if (!user) {
		throw new Error('Cannot render without a user');
	}

	const orgs =
		user?.links?.['is member of']
			.filter((contract) => contract.type.split('@')[0] === 'org')
			.map((org) => ({
				label: org.name,
				type: 'org',
				value: org.slug,
				id: org.id,
			})) ?? [];

	React.useEffect(() => {
		let findActiveOrg: any;
		let findActiveLoop: any;
		let findActiveProduct: any;

		for (const channel of channels) {
			if (!findActiveOrg) {
				findActiveOrg = orgs.find(
					(org) => org.value === channel.data.target || org.id === channel.id,
				);
			}

			// if we're in a loop -> loop is active
			// if we have a product -> containing loop is active as well
			if (!findActiveLoop) {
				findActiveLoop = allLoopsAndProducts.find(
					(loop) =>
						loop.value === channel.data.target ||
						loop.id === channel.id ||
						loop.products.find(
							(product) =>
								product.value === channel.data.target ||
								product.id === channel.id,
						),
				);
			}

			if (!findActiveProduct) {
				findActiveProduct = findActiveLoop?.products.find(
					(product) =>
						product.value === channel.data.target || product.id === channel.id,
				);
			}
		}
		setActiveOrg(findActiveOrg ? findActiveOrg.label : 'Balena');

		setActiveLoop(findActiveLoop ? findActiveLoop.label : null);
		// we could dispatch the active Loop here, if useful // dispatch(actionCreators.setActiveLoop(null));

		setActiveProduct(findActiveProduct ? findActiveProduct.label : null);
	}, [channels, allLoopsAndProducts, orgs]);

	console.log(activeProduct);
	console.log(channels);

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
						id: loop.id,
						products: loop?.links?.has
							?.map((product) => ({
								label: product.name,
								value: product.slug,
								type: 'product',
								id: product.id,
							}))
							.sort((productA: any, productB: any) =>
								productA.label < productB.label ? -1 : 1,
							),
					}));
				setAllLoopsAndProducts(loopsAndProdutOptions);
			})
			.catch(console.error);
	}, []);

	const navigateTo = (e, value) => {
		// Maybe here we can also dispatch the active loop if useful
		// navigate
		history.push(`/${value}`);
	};

	const isActiveLabel = (label: string) =>
		activeLoop === label || activeOrg === label || activeProduct === label;

	const menuOption = (element, subMenu?) => {
		if (subMenu) {
			return (
				<>
					<StyledSubMenu
						active={isActiveLabel(element.label)}
						label={element.label}
					>
						<StyledMenuItem
							// isOrgLoop
							onClick={(e) => navigateTo(e, element.value)}
						>
							{element.label}{' '}
							{subMenu?.[0]?.type === 'loop' ? '(org)' : '(loop)'}
						</StyledMenuItem>
						<MenuDivider />
						<StyledMenuTitle>
							{subMenu?.[0]?.type === 'loop' ? 'Loops' : 'Products'}
						</StyledMenuTitle>
						{subMenu.map((loop) => menuOption(loop, loop.products))}
					</StyledSubMenu>
				</>
			);
		} else {
			return (
				<StyledMenuItem
					active={isActiveLabel(element.label)}
					onClick={(e) => navigateTo(e, element.value)}
				>
					{element.label}
				</StyledMenuItem>
			);
		}
	};

	const getMenuButtonLabel = () => {
		if (activeProduct) {
			return activeProduct;
		}
		if (activeLoop) {
			return activeLoop;
		}
		return activeOrg;
	};

	// TODO: merging of orgs and allLoopsAndProduct won't work for multiple orgs
	return (
		<StyledMenu
			menuButton={
				<StyledMenuButton>
					{getMenuButtonLabel()}
					<Icon style={{ marginLeft: '1rem' }} name="chevron-down" />
				</StyledMenuButton>
			}
			transition
		>
			<StyledMenuTitle>Orgs</StyledMenuTitle>
			{orgs.map((org) => menuOption(org, allLoopsAndProducts))}
		</StyledMenu>
	);
});
