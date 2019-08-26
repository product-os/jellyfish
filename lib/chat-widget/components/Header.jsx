import * as React from 'react'
import {
	Box, Button, Flex, Img, Txt
} from 'rendition'
import {
	useRouter,
	useTheme
} from '../hooks'

const Separator = () => {
	return (
		<Box width="1px" bg="#e8ebf2" m="4px 0 4px 18px" alignSelf="stretch" />
	)
}

export const Header = () => {
	const theme = useTheme()
	const router = useRouter()

	const handleBackButtonClick = React.useCallback(() => {
		router.history.goBack()
	}, [])

	return (
		<Flex
			alignItems="center"
			p="16px 20px"
			bg="white"
			style={{
				borderBottom: 'solid 1px #e8ebf2'
			}}
		>
			<Img
				width={30}
				height={30}
				src={'https://www.balena.io/avatar.png'}
			/>

			<Separator />

			{router.history.canGo(-1) && (
				<Button
					ml="12px"
					plain
					icon={'<'}
					onClick={handleBackButtonClick}
				/>
			)}

			<Box flex="1" fontSize="20px" mt="2px" ml="12px">
				<Txt.span bold>Balena</Txt.span>&nbsp;
				<Txt.span color={theme.colors.tertiary.light}>chat</Txt.span>
			</Box>
		</Flex>
	)
}
