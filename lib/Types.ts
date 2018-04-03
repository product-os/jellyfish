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

export interface JellyfishState {
	// A unique identifier for this app instance
	channels: Channel[];
	types: Type[];
	session: null | {
		authToken: string | null;
		user?: Card;
	};
}

export interface Card {
	id: string;
	type: string;
	tags: string[];
	links: string[];
	active: boolean;
	data: { [key: string]: any };
	name?: string;
	slug?: string;
	transient?: object;
}

export interface Channel extends Card {
	// A unique identifier for this channel
	id: string;
	type: 'channel';
	data: {
		// The uuid or slug of the head card
		card: string;
		// The type of the head card
		type: string;
		// Any error to be displayed
		error?: Error;
		// The id of the card that created this channel
		actor?: string;
		// The head to show in this channel
		head?: Card;
		// The tail to show in this channel
		tail?: Card[];
	};
}

export interface Type extends Card {
	type: 'type';
	slug: string;
	data: {
		schema: JSONSchema6;
		fieldOrder?: string[];
	};
}

export interface RendererProps {
	channel: Channel;
	refresh: () => void;
	openChannel: (data: Channel['data']) => void;
}

