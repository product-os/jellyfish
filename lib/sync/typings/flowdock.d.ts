interface FlowdockStream {
	on(event: string, callback: (response: any) => void): void;
}

type FlowdockCallbackMethod = (error: Error, body: any, result: any) => void;

type FlowdockRequestMethod = (path: string, data: object, callback: FlowdockCallbackMethod) => void;

declare module 'flowdock' {
	class Session {
		public get: FlowdockRequestMethod;
		public post: FlowdockRequestMethod;
		public put: FlowdockRequestMethod;
		constructor(token: string);
		public flows(callback: (error: Error, body: any, result: any) => void): void;
		public stream(ids: string[]): FlowdockStream;
		public on(event: string, callback: (error: Error) => void): void;
		public removeListener(event: string, callback: (error: Error) => void): void;
	}

	interface Organization {
		id: number;
		parameterized_name: string;
		name: string;
		user_limit: number;
		user_count: number;
		active: boolean;
		url: string;
		flow_admins: boolean;
	}

	interface User {
		id: number;
		email: string;
		name: string;
		nick: string;
		avatar: string;
		website: string;
	}

	interface Flow {
		id: string;
		name: string;
		parameterized_name: string;
		organization: Organization;
		open: boolean;
		joined: boolean;
		url: string;
		users: User[];
		web_url: string;
		access_mode: string;
	}

	interface Message {
		app: string;
		sent: number;
		uuid: string;
		tags: string[];
		flow: string;
		id: number;
		event: string;
		user: number;
		created_at: string;
		content: string | object;
		attachments: object[];
		thread_id: string;
		thread: Thread;
	}

	interface Thread {
		created_at: string;
		flow: string;
		id: string;
		initial_message: number;
		internal_comments: number;
		title: string;
	}
}
