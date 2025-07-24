import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddWebBookUserDto } from './dto';
import { handleException } from 'src/utils/error.handler';
import { CustomNotFoundException } from 'src/utils/custom.exceptions';
import { MemoryStorageFile } from '@blazity/nest-file-fastify';
import { addPathToFiles, saveFilesOnServer } from 'src/utils/file.handler';
import { ClientIdentifier } from '../clients/dto';

@Injectable()
export class WebBookUsersService {
    constructor(private readonly prisma: PrismaService) { }

    async addWebBookUser(dto: AddWebBookUserDto, file: MemoryStorageFile) {
        try {
            const ExistingClient = await this.prisma.client.findFirst({
                where: {
                    id: dto.client_id
                }
            })

            if (!ExistingClient) {
                throw new CustomNotFoundException('Client not found!')
            }

            const nestedFolder = `users/user-${ExistingClient.name.replaceAll(' ', '')}`;
            const filesWithPathAndURl = await addPathToFiles([file], 'ElCady', nestedFolder);

            const user = await this.prisma.weBook_users.create({
                data: {
                    name: dto.name,
                    text: dto.text,
                    image: filesWithPathAndURl[0].fileurl,
                    client_id: dto.client_id
                }
            })
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
            return user
        } catch (error) {
            handleException(error, dto)
        }
    }

    async getAllUsers(dto: ClientIdentifier) {
        try {
            const ExistingClient = await this.prisma.client.findFirst({
                where: {
                    id: dto.client_id
                }
            })

            if (!ExistingClient) {
                throw new CustomNotFoundException("Client not found!")
            }

            const users = await this.prisma.weBook_users.findMany({
                where: {
                    client_id: dto.client_id
                },
                orderBy: {
                    createdAt: "desc"
                }
            })

            return users
        } catch (error) {
            handleException(error, dto)
        }
    }

    async deleteAllUsers() {
        try {
            const deletedUsers = await this.prisma.weBook_users.deleteMany()
            return deletedUsers
        } catch (error) {
            handleException(error, {})
        }
    }
}
