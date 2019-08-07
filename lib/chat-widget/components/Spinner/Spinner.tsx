import * as React from 'react';
import CogIcon = require('react-icons/lib/fa/cog');
import ExclamationIcon = require('react-icons/lib/fa/exclamation-triangle');
import { Button, Flex, FlexProps, ThemeType } from 'rendition';
import { ThemeProps, withTheme } from 'styled-components';
import { LoadingStateConfig } from '../../state/reducer';

type SpinnerProps = FlexProps & Partial<LoadingStateConfig>;

const SpinnerBase = ({
	children,
	failed,
	text = failed ? 'Error' : 'Loading',
	retry,
	theme,
	...rest
}: SpinnerProps & ThemeProps<ThemeType>) => (
	<Flex {...rest} alignItems="center" justifyContent="center">
		{failed ? (
			<>
				<ExclamationIcon color={theme.colors.danger.main} />
				&nbsp;{text},&nbsp;
				{retry && (
					<Button onClick={retry} as="a">
						retry
					</Button>
				)}
			</>
		) : (
			<>
				{text}&nbsp;
				<CogIcon className="fa-spin" />
			</>
		)}
	</Flex>
);

export const Spinner = withTheme(SpinnerBase);
