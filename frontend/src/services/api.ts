import axios, { type AxiosError } from "axios";

type ApiStore = {
  getState: () => { auth: { accessToken: string | null } };
  dispatchUnauthorized: () => void;
};

let storeRef: ApiStore | null = null;

export function injectStore(store: ApiStore) {
  storeRef = store;
}

const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = storeRef?.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    if (error.response?.status === 401 && storeRef?.getState().auth.accessToken) {
      storeRef.dispatchUnauthorized();
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (status === 404) {
      return "Endpoint não encontrado. Reinicie o backend (uvicorn) para carregar a versão mais recente da API.";
    }
    if (status === 422) {
      return "Dados inválidos. Confira valores e datas do formulário.";
    }
    if (status === 500) {
      return "Erro no servidor. Verifique se as migrações do banco estão em dia (alembic upgrade head).";
    }
  }
  return "Não foi possível concluir a operação.";
}

export default api;
