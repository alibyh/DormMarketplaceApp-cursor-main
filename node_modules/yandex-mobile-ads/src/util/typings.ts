export function isBoolean(value: any) {
    if (!(typeof value === 'boolean')) {
        throw new Error('Expected to be a boolean value.');
    }
}
