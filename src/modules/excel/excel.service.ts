import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { join } from 'path';

import * as fs from 'fs';

@Injectable()
export class ExcelService {
	/**
	 * Creates an Excel file and returns the link to the generated file.
	 * @param headers Array of column headers
	 * @param data Array of row data
	 * @param filename Name of the generated Excel file
	 * @returns Link to the generated Excel file
	 */
	async createExcelFile(headers: string[], data: any[][], filename: string) {
		const workbook = new ExcelJS.Workbook();
		workbook.company = 'El Cady';
		workbook.creator = 'El Cady';
		const worksheet = workbook.addWorksheet('sheet1');
		const headerRow = worksheet.addRow(headers);
		headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
		headerRow.height = 30;
		headerRow.eachCell((cell) => {
			cell.font = {
				color: { argb: 'FFFFFFFF' }, // white
				bold: true,
				size: 12,
			};
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FF1F4E78' }, // navy blue
			};
		});

		// Add data rows
		data.forEach((rowData) => {
			const row = worksheet.addRow(rowData);
			row.alignment = { horizontal: 'center', vertical: 'middle' };
			row.eachCell((cell) => {
				const isEmpty = cell.value === '' || cell.value === null || cell.value === undefined;
				cell.font = {
					color: { argb: 'FF333333' }, // dark gray text
					size: 11,
				};
				if (isEmpty) {
					cell.fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: { argb: 'FFF3F3F3' }, // light gray for empty cells
					};
				}
			});
		});

		worksheet.columns.forEach((column) => {
			let maxColumnLength = 10; // Default minimum width
			column.eachCell({ includeEmpty: true }, (cell) => {
				const cellValue = cell.text.toString();
				if (cellValue) {
					maxColumnLength = Math.max(maxColumnLength, cellValue.length + 2); // Add padding
				}
			});
			column.width = maxColumnLength;
		});

		const folderPath = join(process.cwd(), '/uploads/excels/');
		const excelsExist = fs.existsSync(folderPath);

		if (!excelsExist) {
			fs.mkdirSync(folderPath, { recursive: true });
		}
		fs.writeFileSync(folderPath + filename, '');

		await workbook.xlsx.writeFile(folderPath + filename);

		const link = { url: `${'excels'}/${filename}` };
		return link;
	}
}
