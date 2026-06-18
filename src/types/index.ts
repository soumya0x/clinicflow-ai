export * from "./database";

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: { message: string; details?: unknown };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DashboardKpis {
  totalCalls: number;
  totalAppointments: number;
  callsToday: number;
  appointmentsToday: number;
  conversionRate: number;
  averageCallDuration: number;
}

export interface TimeSeriesPoint {
  date: string;
  calls: number;
  appointments: number;
}
