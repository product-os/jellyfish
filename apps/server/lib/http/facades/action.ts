import { getLogger } from '@balena/jellyfish-logger';
import type { Producer, Worker } from '@balena/jellyfish-worker';
import errio from 'errio';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';

const logger = getLogger(__filename);

interface FileItem {
	buffer: any;
	name: string;
}

interface FileDetails {
	originalname: string;
	fieldname: string;
	mimetype: string;
	buffer: any;
}

interface ActionFacadeOptions {
	files?: FileDetails[];
}

type ActionPayload = Parameters<Producer['enqueue']>[2];

export class ActionFacade {
	fileStore: any;
	producer: Producer;
	worker: Worker;

	constructor(worker, fileStore) {
		this.fileStore = fileStore;
		this.producer = worker.producer;
		this.worker = worker;
	}

	async processAction(
		context: { [x: string]: any; id: any },
		session: string,
		action: Omit<ActionPayload, 'logContext'>,
		options: ActionFacadeOptions = {},
	) {
		const payload: ActionPayload = {
			logContext: context,
			...action,
		};
		const files: FileItem[] = [];

		if (options.files) {
			const id = uuidv4();

			// Upload magic
			options.files.forEach((file) => {
				const name = `${id}.${file.originalname}`;

				_.set(action.arguments, ['payload', file.fieldname], {
					name: file.originalname,
					slug: name,
					mime: file.mimetype,
					bytesize: file.buffer.byteLength,
				});

				files.push({
					buffer: file.buffer,
					name,
				});
			});
		}

		const finalRequest = await this.worker.pre(session, payload);
		const actionRequest = await this.producer.enqueue(
			this.worker.getId(),
			session,
			finalRequest,
		);

		const results = await this.producer.waitResults(context, actionRequest);
		logger.info(context, 'Got action results', results);

		if (results.error) {
			throw errio.fromObject(results.data);
		}

		if (options.files) {
			const cardId = (results.data! as any).id!;

			for (const item of files) {
				logger.info(context, 'Uploading attachment', {
					card: cardId,
					key: item.name,
				});

				await this.fileStore.store(context, cardId, item.name, item.buffer);
			}
		}

		return results.data;
	}
}
