export interface IQuery {
	searchTream?: string;
	page?: string;
	limit?: string;
	sortOrder?: string;
	sortBy?: string;

	// any other filter filds can be added here

	[key: string]: any;
}
