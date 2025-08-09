export const mapToObject = (map: Map<string, string> | undefined) => {
    if (!map) {
        return {};
    }
    return Object.fromEntries(map.entries());
};
