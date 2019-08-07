import * as React from 'react';
import PaperclipIcon = require('react-icons/lib/fa/paperclip');
import { Button } from 'rendition';
import { selectFiles } from '../../utils/file';

interface FileInputProps {
	onChange: (files: File[]) => void;
}

export class FileInput extends React.Component<FileInputProps> {
	handleClick = async () => {
		const files = await selectFiles();
		this.props.onChange(files);
	};

	render() {
		return (
			<Button
				onClick={this.handleClick}
				plain
				icon={<PaperclipIcon size="20px" color="#527699" />}
			/>
		);
	}
}
