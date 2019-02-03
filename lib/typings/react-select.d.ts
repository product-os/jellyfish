/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

declare module 'react-select/lib/Async' {
	import { Component } from 'react';

	interface Option {
		value: any;
		label: string | void;
	}

	interface AsyncSelectProps {
		value?: Option | null;
		cacheOptions?: boolean;
		defaultOptions?: boolean;
		onChange?: (option: Option) => void;
		loadOptions?: (value: any) => Promise<Option[]>;
	}

	class AsyncSelect extends Component<AsyncSelectProps, any> {}

	export default AsyncSelect;
}

declare module 'react-select' {
	import { Component } from 'react';

	interface Option {
		value: any;
		label: string | void;
	}

	interface SelectProps {
		value?: Option | null;
		onChange?: (option: Option) => void;
		options?: Option[];
	}

	class Select extends Component<SelectProps, any> {}

	export default Select;
}
