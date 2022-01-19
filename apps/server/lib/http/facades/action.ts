import _ from 'lodash';
import errio from 'errio';
import { getLogger } from '@balena/jellyfish-logger';
import { Producer } from '@balena/jellyfish-queue';
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

export class ActionFacade {
	fileStore: any;
	producer: InstanceType<typeof Producer>;
	worker: InstanceType<typeof Worker>;

	constructor(worker, producer, fileStore) {
		this.fileStore = fileStore;
		this.producer = producer;
		this.worker = worker;
	}

	async processAction(
		context,
		session,
		action,
		options: ActionFacadeOptions = {},
	) {
		action.context = context;
		const files: FileItem[] = [];

		if (options.files) {
			const id = uuidv4();

			// Upload magic
			options.files.forEach((file) => {
				const name = `${id}.${file.originalname}`;

				_.set(action.arguments.payload, file.fieldname, {
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

		const finalRequest = await (this.worker as any).pre(session, action);
		const actionRequest = await this.producer.enqueue(
			(this.worker as any).getId(),
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
