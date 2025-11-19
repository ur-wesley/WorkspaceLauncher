/**
 * Fuzzy search utility for workspaces
 */

export interface Searchable {
	id: number;
	name: string;
	description?: string | null;
}

/**
 * Performs fuzzy search on workspace items
 */
export function fuzzySearch<T extends Searchable>(
	items: T[],
	query: string,
): T[] {
	if (!query.trim()) {
		return items;
	}

	const normalizedQuery = query.toLowerCase().trim();

	const matches = items.filter((item) => {
		const searchText = `${item.name} ${item.description || ""}`.toLowerCase();

		if (searchText.includes(normalizedQuery)) {
			return true;
		}

		let queryIndex = 0;
		for (
			let i = 0;
			i < searchText.length && queryIndex < normalizedQuery.length;
			i++
		) {
			if (searchText[i] === normalizedQuery[queryIndex]) {
				queryIndex++;
			}
		}

		return queryIndex === normalizedQuery.length;
	});

	return matches.sort((a, b) => {
		const aText = `${a.name} ${a.description || ""}`.toLowerCase();
		const bText = `${b.name} ${b.description || ""}`.toLowerCase();

		const aExact = aText.includes(normalizedQuery);
		const bExact = bText.includes(normalizedQuery);

		if (aExact && !bExact) return -1;
		if (!aExact && bExact) return 1;

		return a.name.localeCompare(b.name);
	});
}

/**
 * Debounced search function
 */
export function createDebouncedSearch<T>(
	searchFn: (query: string) => T,
	delay = 300,
): (query: string) => void {
	let timeoutId: NodeJS.Timeout;

	return (query: string) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => searchFn(query), delay);
	};
}
