export type PaginationParams = {
  maxResults?: number;
  firstResult?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type CountResult = {
  count: number;
};

export type CamundaVariable = {
  value: any;
  type: string;
  valueInfo: Record<string, any>;
};

export type VariablesMap = Record<string, CamundaVariable>;

export type ApiError = {
  type: string;
  message: string;
  code: number;
};
