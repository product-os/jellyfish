import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import {
	Modal,
} from 'rendition';
import { Form } from 'rendition/dist/unstable';

const notificationSettingsSchema: JSONSchema6 = {
	type: 'object',
	properties: {
		web: {
			title: 'Web',
			description: 'Alert me with desktop notifications',
			type: 'object',
			properties: {
				update: {
					title: 'On update',
					description: 'When new content is added',
					type: 'boolean',
				},
				mention: {
					title: 'On mention',
					description: 'When I am mentioned',
					type: 'boolean',
				},
				alert: {
					title: 'On alert',
					description: 'When I am alerted',
					type: 'boolean',
				},
			},
			additionalProperties: false,
		},
	},
};

interface ModalProps {
	show: boolean;
	settings: null | { [k: string]: any };
	onCancel: () => void;
	onDone: (data: { [k: string]: any }) => void;
}

interface ModalState {
	settings: null | { [k: string]: any };
}

export class NotificationsModal extends React.Component<ModalProps, ModalState> {
	constructor(props: ModalProps) {
		super(props);

		this.state = {
			settings: null,
		};
	}

	public componentWillReceiveProps(nextProps: ModalProps) {
		if (!_.isEqual(nextProps.settings, this.props.settings)) {
			this.setState({
				settings: nextProps.settings || {},
			});
		}
	}

	public done = () => {
		this.props.onDone(this.state.settings || {});
	}

	public handleFormChange = (data: any) => {
		this.setState({ settings: data.formData });
	}

	public render() {
		if (!this.props.show) {
			return null;
		}

		return (
			<Modal
				title="View settings"
				cancel={this.props.onCancel}
				done={this.done}
			>
				<Form
					schema={notificationSettingsSchema}
					value={this.state.settings}
					onFormChange={this.handleFormChange}
					onFormSubmit={this.done}
					hideSubmitButton={true}
				/>
			</Modal>
		);
	}
}
