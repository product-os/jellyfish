import { JSONSchema6 } from 'json-schema';

export interface ContractCapability {
	slug: string;
	componentVersion?: string;
}

export interface ContractRequirement {
	slug: string;
	componentVersion?: string;
	version?: string;
	or?: ContractRequirement[];
}

export interface ContractConflict {
	slug: string;
	version?: string;
}

export interface Contract {
	slug: string;
	version: string;
	componentVersion: string;
	name: string;
	aliases: string[];

	extends?: Partial<Contract> & { slug: string, version: string };
	capabilities?: ContractCapability[];
	requires?: Array<{
		and?: ContractRequirement;
		or?: ContractRequirement;
	}>
	| ContractRequirement[];
	conflicts?: ContractConflict[];
	data?: { [key: string]: any };
	assets?: { [key: string]: string };
}

export interface Notification {
	id: string;
	type: 'success' | 'danger' | 'warning' | 'info';
	message: string;
	timestamp: string;
}

export interface Card {
	id: string;
	version: string;
	type: string;
	tags: string[];
	markers: string[];
	links: object;
	requires: object[];
	capabilities: object[];
	active: boolean;
	data: { [key: string]: any };
	name?: string;
	slug: string;
	transient?: object;
}

export interface Channel extends Card {
	// A unique identifier for this channel
	id: string;
	type: 'channel';
	data: {
		// The uuid or slug of the head card
		target: string;
		// The head card for this channel
		head?: Card;
		// Any error to be displayed
		error?: Error;
		// The id of the channel that created this channel
		parentChannel?: string;
		options?: any;
	};
}

export interface Type extends Card {
	type: 'type';
	slug: string;
	data: {
		schema: JSONSchema6;
		fieldOrder?: string[];
		lenses?: string[];
	};
}

export interface RendererProps {
	channel: Channel;
	tail?: Card[] | null;
	flex?: any;
}

export interface Lens {
	slug: string;
	version: string;
	type: string;
	name: string;
	data: {
		filter: JSONSchema6;
		icon: string;
		renderer: any;
		supportsSlices?: boolean;
		type?: string;
	};
}

export type AppStatus = 'initializing' | 'authorized' | 'unauthorized';

export interface ViewNotice {
	id: string;
	newMentions?: boolean;
	newContent?: boolean;
}
