export const fetchProductDetail = <T,>(url: string) => fetch(url).then((res) => res.json() as Promise<T>);
