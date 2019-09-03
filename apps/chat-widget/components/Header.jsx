import * as React from 'react'
import {
	Box, Button, Flex, Txt
} from 'rendition'
import {
	useRouter
} from '../hooks'

export const Header = () => {
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
				<Txt.span color="colors.tertiary.light">chat</Txt.span>
			</Box>
		</Flex>
	)
}
