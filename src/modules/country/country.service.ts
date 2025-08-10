import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCountryDto, CountryIdentifier, UpdateCountryDto } from './dto';
import { handleException } from 'src/utils/error.handler';
import { CustomBadRequestException, CustomNotFoundException } from 'src/utils/custom.exceptions';

@Injectable()
export class CountryService {
    constructor(private readonly prisma: PrismaService) { }

    async addCountry(dto: AddCountryDto) {
        try {
            const ExistingCountry = await this.prisma.country.findFirst({
                where: {
                    title: dto.title
                }
            })

            if (ExistingCountry) {
                throw new CustomBadRequestException('There is country with this title already')
            }

            const Country = await this.prisma.country.create({
                data: {
                    title: dto.title
                }
            })

            return Country
        } catch (error) {
            handleException(error, dto)
        }
    }

    async updateCountry(dto: UpdateCountryDto) {
        try {
            const ExistingCountry = await this.prisma.country.findFirst({
                where: {
                    id: dto.country_id
                }
            })

            if (!ExistingCountry) {
                throw new CustomNotFoundException('Country not found!')
            }

            const updatedCountry = await this.prisma.country.update({
                where: {
                    id: dto.country_id
                },
                data: {
                    ...(dto.title && { title: dto.title })
                }
            })

            return updatedCountry
        } catch (error) {
            handleException(error, dto)
        }
    }

    async deleteCountry(dto: CountryIdentifier) {
        try {
            const ExistingCountry = await this.prisma.country.findFirst({
                where: {
                    id: dto.country_id
                }
            })

            if (!ExistingCountry) {
                throw new CustomNotFoundException('Country not found!')
            }

            const deletedCountry = await this.prisma.country.delete({
                where: {
                    id: dto.country_id
                }
            })

            return deletedCountry
        } catch (error) {
            handleException(error, dto)
        }
    }

    async getAllCountries() {
        try {
            const Countries = await this.prisma.country.findMany()
            return Countries
        } catch (error) {
            handleException(error, {})
        }
    }
}
