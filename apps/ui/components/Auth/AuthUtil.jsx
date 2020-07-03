/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import styled from 'styled-components'
import {
	Flex, Heading, Input, Button, Img
} from 'rendition'
import Link from '../../../../lib/ui-components/Link'

const Label = styled.label `
	font-size: 1;
`
const Form = styled.form `
	align-self: stretch;
`

const FlexCard = styled(Flex) `
	background: white;
	border-radius: 2px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);
`

const HeadingFlex = styled(Flex) `
	text-align: center;
`

export const AuthCard = ({
	children,
	...props
}) => {
	return (
		<FlexCard
			p={4}
			flex={[ '1 auto', '0 auto' ]}
			width={[ '100%', '470px' ]}
			flexDirection="column"
			alignItems="center"
			{...props}
		>
			<Img
				width="70px"
				height="70px"
				src="/icons/jellyfish-icon.svg"
			/>
			{children}
		</FlexCard>
	)
}

export const AuthForm = ({
	children,
	...props
}) => {
	return (
		<Form {...props}>{children}</Form>
	)
}

export const AuthHeading = ({
	title, subtitle
}) => {
	return (
		<HeadingFlex mb={3} alignItems="center" flexDirection="column">
			{title && <Heading.h2 mb={1}>{title}</Heading.h2>}
			{subtitle && <Heading.h5>{subtitle}</Heading.h5>}
		</HeadingFlex>
	)
}

export const AuthField = ({
	name,
	label,
	...props
}) => {
	return (
		<React.Fragment>
			<Label mb={1} htmlFor={name}>{label}</Label>
			<Input
				name={name}
				mb={3}
				width="100%"
				emphasized={true}
				{...props}
			/>
		</React.Fragment>
	)
}

export const AuthButton = (props) => {
	return (
		<Button
			mt={2}
			width="100%"
			primary={true}
			emphasized={true}
			type="submit"
			{...props}
		/>
	)
}

export const AuthLink = ({
	children, ...props
}) => {
	return <Link mt={3} {...props}>{children}</Link>
}
