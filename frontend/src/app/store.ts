import { configureStore } from "@reduxjs/toolkit";

import { registerValuesHiddenReader } from "../utils/money";
import accountsReducer from "../features/accounts/accountsSlice";
import assetsReducer from "../features/assets/assetsSlice";
import authReducer, { logout } from "../features/auth/authSlice";
import portfolioReducer from "../features/portfolio/portfolioSlice";
import uiReducer from "../features/ui/uiSlice";
import { injectStore } from "../services/api";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    accounts: accountsReducer,
    assets: assetsReducer,
    portfolio: portfolioReducer,
    ui: uiReducer,
  },
});

registerValuesHiddenReader(() => store.getState().ui.valuesHidden);

injectStore({
  getState: store.getState,
  dispatchUnauthorized: () => {
    store.dispatch(logout());
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;