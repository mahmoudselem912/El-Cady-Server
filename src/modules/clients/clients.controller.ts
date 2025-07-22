import { Body, Controller, Delete, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { successfulResponse } from 'src/utils/response.handler';
import { AddClientDto, ClientIdentifier, UpdateClientDto } from './dto';

@Controller('clients')
@ApiTags('Clients')
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    @Post('add-client')
    async AddClient(@Body() dto: AddClientDto) {
        const data = await this.clientsService.addClient(dto)
        return successfulResponse(data)
    }

    @Patch('update-client')
    async UpdateClient(@Query() dto: UpdateClientDto) {
        const data = await this.clientsService.updateClient(dto)
        return successfulResponse(data)
    }

    @Delete('delete-client')
    async DeleteClient(@Query() dto: ClientIdentifier) {
        const data = await this.clientsService.deleteClient(dto)
        return successfulResponse(data)
    }

    @Get('get-all-clients')
    async GetAllClients() {
        const data = await this.clientsService.getAllClients()
        return successfulResponse(data)
    }
}
