import React from 'react';
import cn from 'classnames';
import styled from 'styled-components';
import { Box, BoxProps, Flex, Txt } from 'rendition';
import Icon from './Icon';
import { px } from '../services/helpers';
import useDebounce from '../hooks/use-debounce';

const DELAY = 500;

const CollapsibleWrapper = styled(Box)``;

const CollapsibleHeader = styled(Flex)`
	cursor: pointer;
`;

const CollapsibleContent = styled(Box)`
	max-height: ${(props: { maxHeight: number }) => {
		return px(props.maxHeight);
	}};
	transition: max-height ease-in-out ${DELAY}ms;
	overflow-y: auto;
	&.collapsed {
		max-height: 0;
		overflow-y: hidden;
	}
`;

interface CollapsibleProps extends BoxProps {
	title: string;
	collapsible?: boolean;
	defaultCollapsed?: boolean;
	maxContentHeight?: string | number;
	lazyLoadContent?: boolean;
	headerProps?: any;
	contentProps?: any;
	'data-test'?: string;
}

const Collapsible: React.FunctionComponent<CollapsibleProps> = ({
	title,
	collapsible = true,
	defaultCollapsed = true,
	maxContentHeight = 1000,
	lazyLoadContent = false,
	headerProps = {},
	contentProps = {},
	children,
	...rest
}) => {
	const [isCollapsed, setIsCollapsed] = React.useState(
		collapsible && defaultCollapsed,
	);
	const isContentLoaded = useDebounce(!isCollapsed, DELAY, {
		lagOnRisingEdge: false,
	});
	const toggleCollapsed = () => {
		setIsCollapsed(!isCollapsed);
	};
	const dataTest = rest['data-test'] || 'collapsible';
	return (
		<CollapsibleWrapper data-test={dataTest} {...rest}>
			{collapsible && (
				<CollapsibleHeader
					color="primary.main"
					alignItems="center"
					onClick={toggleCollapsed}
					data-test={`${dataTest}__header`}
					{...headerProps}
				>
					<Box mr={2}>
						<Icon name="angle-down" rotate={isCollapsed ? 0 : 180} />
					</Box>
					{typeof title === 'string' ? <Txt>{title}</Txt> : title}
				</CollapsibleHeader>
			)}
			<CollapsibleContent
				data-test={`${dataTest}__content`}
				maxHeight={maxContentHeight}
				className={cn({
					collapsed: isCollapsed,
				})}
				{...contentProps}
			>
				{(!lazyLoadContent || isContentLoaded) && children}
			</CollapsibleContent>
		</CollapsibleWrapper>
	);
};

export default Collapsible;
