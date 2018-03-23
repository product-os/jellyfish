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

export interface Card {
	id?: string;
	type?: string;
	tags?: string[];
	links?: string[];
	active?: boolean;
	data?: { [key: string]: any };
	name?: string;
	slug?: string;
	transient?: object;
}

