import * as React from 'react';
import { useSelector } from 'react-redux';
import { Box, Button, Flex, Txt, Img, useTheme } from 'rendition';
import { Icon } from '../../';
// @ts-ignore
import logoSrc from '../assets/images/support-logo.svg';
import { useRouter } from '../hooks';
import { AvailabilityStatus } from './AvailabilityStatus';

const Separator = () => {
	return (
		<Box width="1px" bg="#e8ebf2" m="4px 0 4px 18px" alignSelf="stretch" />
	);
};

export const Header = ({ onClose }) => {
	const router = useRouter();
	const theme = useTheme();
	const productTitle = useSelector<any, any>((state) => {
		return state.productTitle;
	});

	const handleBackButtonClick = React.useCallback(() => {
		router.history.goBack();
	}, []);

	return (
		<Flex
			alignItems="center"
			p="16px 20px"
			bg="white"
			style={{
				borderBottom: 'solid 1px #e8ebf2',
			}}
		>
			<Img src={logoSrc} />
			<Separator />
			{/*`canGo` is present in `router.history` but it's missing from `@types/history`*/}
			{(router.history as any).canGo(-1) && (
				<Button
					ml="12px"
					fontSize="20px"
					plain
					icon={<Icon name="angle-left" />}
					onClick={handleBackButtonClick}
					data-test="navigate-back-button"
				/>
			)}
			<Box flex="1" fontSize="20px" mt="2px" ml="12px">
				<Txt.span bold>{productTitle}</Txt.span>&nbsp;
				<Txt.span color={theme.colors.tertiary.light}>chat</Txt.span>
			</Box>
			<AvailabilityStatus />
			<Button
				data-test="close-chat-widget"
				fontSize="14px"
				ml="20px"
				plain
				icon={<Icon name="times" />}
				onClick={onClose}
			/>
		</Flex>
	);
};
