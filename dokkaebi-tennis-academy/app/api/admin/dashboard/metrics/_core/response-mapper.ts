/** Responsibility: response DTO mapping only (aggregate -> transport DTO). */
export function mapDashboardMetricsResponse<T>(aggregate: T): T {
  return aggregate;
}
