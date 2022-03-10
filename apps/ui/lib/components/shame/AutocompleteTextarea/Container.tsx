import styled from 'styled-components';
import { Box, Theme } from 'rendition';

const Container = styled(Box)`
	.rta {
		position: relative;
		font-size: 1em;
		width: 100%;
		height: 100%;
	}
	.rta__loader.rta__loader--empty-suggestion-data {
		border-radius: 3px;
		box-shadow: 0 0 5px rgba(27, 31, 35, 0.1);
		padding: 5px;
	}
	.rta--loading .rta__loader.rta__loader--suggestion-data {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(255, 255, 255, 0.8);
	}
	.rta--loading .rta__loader.rta__loader--suggestion-data > * {
		position: relative;
		top: 50%;
	}
	.rta__textarea {
		width: 100%;
		height: 100%;
		font-size: 1em;
		border-radius: ${Theme.radius}px;
		border: 1px solid ${Theme.colors.gray.main};
		padding: 8px 16px;
		resize: vertical;
		display: block;
		&:hover {
			box-shadow: 0 0 4px 1px rgba(0, 0, 0, 0.1);
		}
		&::placeholder {
			color: ${Theme.colors.gray.main};
		}
	}
	.rta__autocomplete {
		position: absolute;
		display: block;
		margin-top: 1em;
	}
	.rta__autocomplete--top {
		margin-top: 0;
		margin-bottom: 1em;
	}
	.rta__list {
		margin: 0;
		padding: 0;
		background: #fff;
		border: 1px solid #dfe2e5;
		border-radius: 3px;
		box-shadow: 0 0 5px rgba(27, 31, 35, 0.1);
		list-style: none;
	}
	.rta__entity {
		background: white;
		width: 100%;
		text-align: left;
		outline: none;
	}
	.rta__entity:hover {
		cursor: pointer;
	}
	.rta__item:not(:last-child) {
		border-bottom: 1px solid #dfe2e5;
	}
	.rta__entity > * {
		padding-left: 4px;
		padding-right: 4px;
	}
	.rta__entity--selected {
		color: #fff;
		text-decoration: none;
		background: #0366d6;
	}
`;

export default Container;
