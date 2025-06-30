export function successfulResponse(data: any, count: number = null) {
	return count != null ? { status: 'success', count, data } : { status: 'success', data };
}
