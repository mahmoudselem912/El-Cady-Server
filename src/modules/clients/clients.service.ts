import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddClientDto, ClientIdentifier, UpdateClientDto } from './dto';
import { handleException } from 'src/utils/error.handler';
import { CustomBadRequestException, CustomNotFoundException } from 'src/utils/custom.exceptions';

@Injectable()
export class ClientsService {
    constructor(private readonly prisma: PrismaService) { }

    async addClient(dto: AddClientDto) {
        try {
            const ExistingClient = await this.prisma.client.findFirst({
                where: {
                    name: dto.name
                }
            })

            if (ExistingClient) {
                throw new CustomBadRequestException('There is client with this name already !')
            }

            const client = await this.prisma.client.create({
                data: {
                    name: dto.name
                }
            })

            return client
        } catch (error) {
            handleException(error, dto)
        }
    }

    async updateClient(dto: UpdateClientDto) {
        try {
            const ExistingClient = await this.prisma.client.findFirst({
                where: {
                    id: dto.client_id
                }
            })

            if (!ExistingClient) {
                throw new CustomNotFoundException('Client not found!')
            }

            const updatedClient = await this.prisma.client.update({
                where: {
                    id: dto.client_id
                },
                data: {
                    name: dto.name
                }
            })

            return updatedClient
        } catch (error) {
            handleException(error, dto)
        }
    }

    async deleteClient(dto: ClientIdentifier) {
        try {
            const ExistingClient = await this.prisma.client.findFirst({
                where: {
                    id: dto.client_id
                }
            })

            if (!ExistingClient) {
                throw new CustomNotFoundException('Client not found!')
            }

            const deletedClient = await this.prisma.client.delete({
                where: {
                    id: dto.client_id
                }
            })

            return deletedClient
        } catch (error) {
            handleException(error, dto)
        }
    }

    async getAllClients() {
        try {
            const clients = await this.prisma.client.findMany()
            return clients
        } catch (error) {
            handleException(error, {})
        }
    }
}
