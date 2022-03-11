import React from 'react';
import styled from 'styled-components';
import { Flex, Heading, Input, Button, Img, Card } from 'rendition';
import * as helpers from '../../services/helpers';
import { Link } from '..';

const StyledCard = styled(Card)`
	@media (max-width: ${(props) => {
			return helpers.px(props.theme.breakpoints[0]);
		}}) {
		border: none;
		border-radius: 0;
		flex: 1;
	}
`;

const Label = styled.label`
	margin-bottom: ${(props) => helpers.px(props.theme.space[1])};
	font-size: 1;
`;
const Form = styled.form`
	align-self: stretch;
`;

const HeadingFlex = styled(Flex)`
	text-align: center;
`;

export const AuthCard = ({ children, ...props }) => {
	return (
		<StyledCard width={['100%', '470px']} p={4}>
			<Flex
				flex={['1 auto', '0 auto']}
				flexDirection="column"
				alignItems="center"
				{...props}
			>
				<Img
					// @ts-ignore ImgProps (incorrectly?) doesn't support width and height
					width="70px"
					height="70px"
					src="/icons/jellyfish-icon.svg"
				/>
				{children}
			</Flex>
		</StyledCard>
	);
};

export const AuthForm = ({ children, ...props }) => {
	return <Form {...props}>{children}</Form>;
};

export const AuthHeading = ({ title, subtitle }) => {
	return (
		<HeadingFlex mb={3} alignItems="center" flexDirection="column">
			{title && <Heading.h2 mb={1}>{title}</Heading.h2>}
			{subtitle && <Heading.h5>{subtitle}</Heading.h5>}
		</HeadingFlex>
	);
};

export const AuthField = ({ name, label, ...props }) => {
	return (
		<React.Fragment>
			<Label htmlFor={name}>{label}</Label>
			<Input name={name} mb={3} width="100%" emphasized={true} {...props} />
		</React.Fragment>
	);
};

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
	);
};

export const AuthLink = ({ children, ...props }) => {
	return (
		<Link mt={3} {...props}>
			{children}
		</Link>
	);
};
