export const fetchWithCredentials = <T,>(url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json() as Promise<T>);
