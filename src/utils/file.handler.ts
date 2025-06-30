import { MemoryStorageFile } from '@blazity/nest-file-fastify';
import { dirname, join } from 'path';
import { createWriteStream, promises as fs } from 'fs';
import { CustomBadRequestException } from './custom.exceptions';
import { v4 as uuidv4 } from 'uuid';
import { InternalServerErrorException } from '@nestjs/common';
import { pipeline, Readable } from 'stream';
import { promisify } from 'util';
import { DeleteFilesDto } from './GlobalDto/global.dto';
import { glob } from 'glob';

export interface MemoryStorageFileWithPathAndUrl extends MemoryStorageFile {
	filepath: string;
	fileurl: string;
}

export function formatQrcodeFolderName(qrcode: string, nestedFolder: string) {
	const currentDate = new Date();
	const year = currentDate.getFullYear();
	const month = String(currentDate.getMonth() + 1).padStart(2, '0');
	return `data-${year}-${month}/client-${encodeURIComponent(qrcode)}${'/' + nestedFolder || ''}`;
	// return `client-${encodeURIComponent(qrcode)}${'/' + nestedFolder || ''}`;
}

export async function addPathToFiles(
	files: MemoryStorageFile[],
	clientQrcode: string,
	nestedFolder?: string,
): Promise<MemoryStorageFileWithPathAndUrl[]> {
	try {
		const folderName = formatQrcodeFolderName(clientQrcode, nestedFolder);

		const folderPath = join(process.cwd(), '/uploads', folderName);

		await fs.mkdir(dirname(folderPath), { recursive: true });

		return files.map((file) => {
			if (!file) {
				throw new CustomBadRequestException(`file ${file.fieldname} is required`);
			}

			const id: string = uuidv4();
			const fileName = `${id}-${Date.now()}-${file.fieldname}.${file.mimetype.split('/')[1]}`;

			const filepath = join(folderPath, fileName);

			const fileurl = `${folderName}/${fileName}`;

			return { ...file, filepath: filepath, fileurl: fileurl };
		});
	} catch (error) {
		throw new InternalServerErrorException('Error formatting files with paths and urls:', (error as Error).message);
	}
}

export async function saveFilesOnServer(files: MemoryStorageFileWithPathAndUrl[]) {
	try {
		for (const file of files) {
			if (!file) continue;

			await fs.mkdir(dirname(file.filepath), { recursive: true });

			const writeStream = createWriteStream(file.filepath);

			const fileStream = Readable.from(file.buffer);

			await promisify(pipeline)(fileStream, writeStream);
		}

		return 'files saved successfully';
	} catch (error) {
		throw new InternalServerErrorException('Error saving files:', (error as Error).message);
	}
}

export async function deleteFilesByGlob(dto: DeleteFilesDto) {
	try {
		const globPatterns = dto.fileFieldNames.map((fileFieldName) => `*${fileFieldName}*`);

		const dirPath = formatQrcodeFolderName(dto.clientQrcode, dto.nestedFolder);

		const dir = join(process.cwd(), '/uploads', dirPath);

		const files: any = await glob(globPatterns, { cwd: dir });

		const deletedFiles = [];
		for (const file of files) {
			const filePath = join(dir, file);
			await fs.unlink(filePath);
			deletedFiles.push(file);
		}

		return deletedFiles;
	} catch (error) {
		throw new InternalServerErrorException(`error deleting files:${(error as Error).message}`);
	}
}
