import styled from 'styled-components';

export interface HideableProps {
	isHidden?: boolean;
}

export const Hideable = (Component) => styled(Component)<HideableProps>`
	opacity: ${(props) => (props.isHidden ? 0 : 1)};
	transition: opacity ease-in-out 300ms;
`;
