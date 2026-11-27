import api from "./api";
import type { ProjectionRunRequest, ProjectionRunResponse } from "../types/projection";

export async function runProjection(
  body: ProjectionRunRequest,
): Promise<ProjectionRunResponse> {
  const response = await api.post<ProjectionRunResponse>("/projections/run", body);
  return response.data;
}