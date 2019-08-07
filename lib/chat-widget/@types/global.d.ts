interface Conversation {
    id: string;
    created_at: number;
    subject: string;
    blurb: string;
}

// Next lines will change, just for making types work!
interface Attachment {
	id: string;
	filename: string;
	url: string;
	contentType: string;
	size: number;
	metadata: any;
}

interface Message {
	id: string;
	subject: string;
	body: string;
	blurb: string;
	attachments: Attachment[];
	is_inbound: boolean;
	created_at: number;
	metadata: {
		headers: any;
	};
}

interface Paginated<TRecord> {
	nextPageToken: string;
	records: TRecord[];
}
