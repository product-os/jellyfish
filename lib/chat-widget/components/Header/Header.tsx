import * as React from 'react';
import BackIcon = require('react-icons/lib/fa/angle-left');
import { Box, Button, Flex, FlexProps, Img, ThemeType, Txt } from 'rendition';
import { ThemeProps, withTheme } from 'styled-components';
import * as logoSrc from '../../assets/images/logo.svg';
import { AvailabilityStatus } from '../AvailabilityStatus/AvailabilityStatus';

const Separator = () => (
	<Box width="1px" bg="#e8ebf2" m="4px 0 4px 18px" alignSelf="stretch" />
);

interface HeaderProps extends FlexProps {
	isSupportAgentOnline: boolean;
	onBackNavigation?: () => void;
}

export const HeaderBase = ({
	isSupportAgentOnline,
	onBackNavigation,
	theme,
}: HeaderProps & ThemeProps<ThemeType>) => (
	<Flex
		alignItems="center"
		p="16px 20px"
		bg="white"
		style={{
			borderBottom: 'solid 1px #e8ebf2',
		}}
	>
		{/* Logo */}
		<Img
			width={30}
			height={30}
			src={logoSrc}
		/>

		<Separator />

		{/* Back button */}
		{onBackNavigation && (
			<Button
				ml="12px"
				plain
				icon={<BackIcon size="20px" />}
				onClick={onBackNavigation}
			/>
		)}

		{/* Title */}
		<Box flex="1" fontSize="20px" mt="2px" ml="12px">
			<Txt.span bold>Balena</Txt.span>&nbsp;
			<Txt.span color={theme.colors.tertiary.light}>chat</Txt.span>
		</Box>

		<AvailabilityStatus isSupportAgentOnline={isSupportAgentOnline} />
	</Flex>
);

export const Header = withTheme(HeaderBase);
