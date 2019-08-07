export const selectFiles = (() => {
	let listener: ((files: File[]) => void) | null = null;
	const input = document.createElement('input');
	input.type = 'file';
	input.multiple = true;

	input.onchange = (e: Event) => {
		const files = Array.from((e.target as HTMLInputElement).files!);
		if (listener) {
			listener(files);
		}
		input.value = '';
	};

	return () => {
		return new Promise<File[]>(resolve => {
			listener = resolve;
			input.click();
		});
	};
})();

export const truncateFileName = (str: string, length = 10) => {
	const lastDotIndex = str.lastIndexOf('.');
	let ext;
	let name;

	if (lastDotIndex === -1) {
		ext = '';
		name = str;
	} else {
		ext = str.substring(lastDotIndex + 1).toLowerCase();
		name = str.substring(0, lastDotIndex);
	}

	if (name.length <= length) {
		return str;
	}

	name = name.substr(0, length) + (str.length > length ? '[...]' : '');
	return ext ? name + '.' + ext : name;
};

export const downloadFile = (blob: Blob, name: string) => {
	const anchor = document.createElement('a');
	anchor.href = window.URL.createObjectURL(blob);
	anchor.download = name;
	anchor.click();
};
