import { Body, Controller, Delete, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CountryService } from './country.service';
import { successfulResponse } from 'src/utils/response.handler';
import { AddCountryDto, CountryIdentifier, UpdateCountryDto } from './dto';

@Controller('country')
@ApiTags('country')
export class CountryController {
    constructor(private readonly countryService: CountryService) { }

    @Post('add-country')
    async AddCountry(@Body() dto: AddCountryDto) {
        const data = await this.countryService.addCountry(dto)
        return successfulResponse(data)
    }

    @Patch('update-country')
    async UpdateCountry(@Query() dto: UpdateCountryDto) {
        const data = await this.countryService.updateCountry(dto)
        return successfulResponse(data)
    }

    @Delete('delete-country')
    async DeleteCountry(@Query() dto: CountryIdentifier) {
        const data = await this.countryService.deleteCountry(dto)
        return successfulResponse(data)
    }

    @Get('get-all-countries')
    async GetAllCountries() {
        const data = await this.countryService.getAllCountries()
        return successfulResponse(data)
    }
}
