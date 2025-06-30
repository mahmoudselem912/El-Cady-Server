import { Transform } from 'class-transformer';

export function ParseArrayOrString() {
	return Transform(({ value }) => {
		if (typeof value === 'string') {
			try {
				return JSON.parse(value);
			} catch (error) {
				return value;
			}
		} else {
			return value;
		}
	});
}
