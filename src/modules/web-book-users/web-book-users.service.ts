import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddWebBookUserDto, SwapPhotoDto, UpdateWebBookUserDto, UploadSwapPhotosDto, UserIdentifier } from './dto';
import { handleException } from 'src/utils/error.handler';
import { CustomNotFoundException } from 'src/utils/custom.exceptions';
import { MemoryStorageFile } from '@blazity/nest-file-fastify';
import { addPathToFiles, saveFilesOnServer } from 'src/utils/file.handler';
import { ClientIdentifier } from '../clients/dto';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

@Injectable()
export class WebBookUsersService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly config: ConfigService,
	) {}

	async addWebBookUser(dto: AddWebBookUserDto, file: MemoryStorageFile) {
		try {
			const ExistingClient = await this.prisma.client.findFirst({
				where: {
					id: dto.client_id,
				},
			});

			if (!ExistingClient) {
				throw new CustomNotFoundException('Client not found!');
			}

			const nestedFolder = `users/user-${ExistingClient.name.replaceAll(' ', '')}`;
			const filesWithPathAndURl = await addPathToFiles([file], 'ElCady', nestedFolder);

			const user = await this.prisma.weBook_users.create({
				data: {
					name: dto.name,
					text: dto.text,
					image: filesWithPathAndURl[0].fileurl,
					client_id: dto.client_id,
				},
			});
			if (file)
				try {
					await saveFilesOnServer(filesWithPathAndURl);
				} catch (error) {
					await this.prisma.weBook_users.delete({
						where: { id: user.id },
					});

					throw new InternalServerErrorException(
						'Error saving files while creating User',
						(error as Error).message,
					);
				}
			return user;
		} catch (error) {
			handleException(error, dto);
		}
	}

	async getAllUsers(dto: ClientIdentifier) {
		try {
			const ExistingClient = await this.prisma.client.findFirst({
				where: {
					id: dto.client_id,
				},
			});

			if (!ExistingClient) {
				throw new CustomNotFoundException('Client not found!');
			}

			const users = await this.prisma.weBook_users.findMany({
				where: {
					client_id: dto.client_id,
				},
				orderBy: {
					createdAt: 'desc',
				},
			});

			return users;
		} catch (error) {
			handleException(error, dto);
		}
	}

	async deleteAllUsers(dto: ClientIdentifier) {
		try {
			const deletedUsers = await this.prisma.weBook_users.deleteMany({
				where: {
					client_id: dto.client_id,
				},
			});
			return deletedUsers;
		} catch (error) {
			handleException(error, {});
		}
	}

	async deleteUser(dto: UserIdentifier) {
		try {
			const deletedUser = await this.prisma.weBook_users.delete({
				where: {
					id: dto.user_id,
				},
			});

			return deletedUser;
		} catch (error) {
			handleException(error, dto);
		}
	}

	async updateWebBookUser(dto: UpdateWebBookUserDto) {
		try {
			const user = await this.prisma.weBook_users.findFirst({
				where: {
					id: dto.user_id,
				},
			});

			if (!user) {
				throw new CustomNotFoundException('User not found!');
			}

			const updatedUser = await this.prisma.weBook_users.update({
				where: {
					id: dto.user_id,
				},
				data: {
					...(dto.name && { name: dto.name }),
					...(dto.text && { text: dto.text }),
				},
			});

			return updatedUser;
		} catch (error) {
			handleException(error, dto);
		}
	}

	async uploadSwapPhotos(dto: UploadSwapPhotosDto, files: MemoryStorageFile[]) {
		try {
			const ExistingCountry = await this.prisma.country.findFirst({
				where: {
					id: dto.country_id,
				},
			});

			if (!ExistingCountry) {
				throw new CustomNotFoundException('Country not found!');
			}

			const ExistingClient = await this.prisma.client.findFirst({
				where: {
					id: dto.client_id,
				},
			});

			if (!ExistingClient) {
				throw new CustomNotFoundException('Client not found!');
			}

			const id: string = uuidv4();
			const nestedFolder = `swapPhotos/swapPhoto`;

			const filesWithPathAndURl = await addPathToFiles([...files], 'ElCady', nestedFolder);
			const swapPhotos = await this.prisma.swapPhotos.createMany({
				data: filesWithPathAndURl.map((file, index) => ({
					image: file.fileurl,
					gender: dto.gender,
					body: dto.body,
					country_id: ExistingCountry.id,
					client_id: ExistingClient.id,
					uuid: id,
				})),
			});

			try {
				await saveFilesOnServer(filesWithPathAndURl);
			} catch (error) {
				await this.prisma.swapPhotos.deleteMany({
					where: { uuid: id },
				});

				throw new InternalServerErrorException(
					'Error saving files while creating Swap Photos',
					(error as Error).message,
				);
			}
			return swapPhotos;
		} catch (error) {
			handleException(error);
		}
	}

	async getAllSwapPhotos() {
		try {
			const swapPhotos = await this.prisma.swapPhotos.findMany();
			return swapPhotos;
		} catch (error) {
			handleException(error, {});
		}
	}
	async imageUrlToBase64(imageUrl: string): Promise<string> {
		console.log(imageUrl);
		const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
		return Buffer.from(response.data, 'binary').toString('base64');
	}

	async imageFileToBase64(imagePath: string): Promise<string> {
		const imageData = fs.readFileSync(path.resolve(imagePath));
		return Buffer.from(imageData).toString('base64');
	}

	async callSegmindSwapApi(sourceBase64: string, targetBase64: string) {
		const url = 'https://api.segmind.com/v1/faceswap-v4';
		const apiKey = this.config.get('SWAP_API_KEY');

		const payload = {
			source_image: sourceBase64,
			target_image: targetBase64,
			model_type: 'speed',
			swap_type: 'head',
			style_type: 'normal',
			seed: 4208875,
			image_format: 'png',
			image_quality: 90,
			hardware: 'fast',
			base64: false,
		};

		console.log(apiKey);
		return axios.post(url, payload, {
			headers: {
				'x-api-key': apiKey,
			},
			responseType: 'arraybuffer',
		});
	}

	async resizeBase64Image(base64: string, width: number = 1024): Promise<string> {
		const buffer = Buffer.from(base64, 'base64');
		const resizedBuffer = await sharp(buffer)
			.resize({ width, withoutEnlargement: true })
			.toFormat('png') // keep format consistent
			.toBuffer();
		return resizedBuffer.toString('base64');
	}

	async swapPhoto(dto: SwapPhotoDto, file: MemoryStorageFile) {
		try {
			// 1. Get target image URL from DB
			const targetPhoto = await this.prisma.swapPhotos.findFirst({
				where: {
					country_id: dto.country_id,
					gender: dto.gender,
					body: dto.gender === 'Female' ? undefined : dto.body,
					client_id: dto.client_id,
				},
			});

			if (!targetPhoto) {
				throw new CustomNotFoundException('Target swap photo not found');
			}

			// 2. Convert source file (uploaded) to base64
			const sourceBase64 = Buffer.from(file.buffer).toString('base64');

			// 3. Convert target image URL to base64
			const targetBase64 = await this.imageFileToBase64('uploads/' + targetPhoto.image);

			// const resizedSource = await this.resizeBase64Image(sourceBase64, 1024);
			// const resizedTarget = await this.resizeBase64Image(targetBase64, 1024);
			console.log('Start calling Segmind API');
			// 4. Call Segmind API
			const response = await this.callSegmindSwapApi(sourceBase64, targetBase64);
			console.log('Fininshed....');
			const base64Image = Buffer.from(response.data).toString('base64'); // no 'binary'
			const contentType = response.headers['content-type'] || 'image/png';

			// Construct the data URL
			const dataUrl = `data:${contentType};base64,${base64Image}`;

			return dataUrl;
		} catch (error) {
			handleException(error, dto);
		}
	}

	async deleteAllSwapPhotos() {
		try {
			const deletedSwapPhotos = await this.prisma.swapPhotos.deleteMany();
			return deletedSwapPhotos;
		} catch (error) {
			handleException(error, {});
		}
	}
}
