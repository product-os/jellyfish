/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

declare module '@webscopeio/react-textarea-autocomplete/dist/react-textarea-autocomplete.cjs.js' {
	import { Component } from 'react';

	type Trigger = {
		[triggerChar: string]: {
			output?: (
				item: { [k: string]: any },
				trigger?: string,
			) =>
				{
					key?: string,
					text: string,
					caretPosition: 'start' | 'end' | 'next' | number,
				} | string,
			dataProvider: (
				token: string,
			) => Promise<Array<object | string>> | Array<object | string>,
			component: (props?: any) => JSX.Element,
		},
	};

	interface AutoCompleteProps extends React.DOMAttributes<HTMLElement> {
		// React attributes
		className?: string;

		// Default textarea props
		monospace?: boolean;
		autoComplete?: string;
		autoFocus?: boolean;
		cols?: number;
		dirName?: string;
		disabled?: boolean;
		form?: string;
		maxLength?: number;
		minLength?: number;
		name?: string;
		placeholder?: string;
		readOnly?: boolean;
		required?: boolean;
		rows?: number;
		value?: string | string[] | number;
		wrap?: string;
		onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;

		// Autocomplete specific props
		trigger?: Trigger;
		loadingComponent: () => JSX.Element;

	}

	class AutoComplete extends Component<AutoCompleteProps, any> {}

	export = AutoComplete;
}
