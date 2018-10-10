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
