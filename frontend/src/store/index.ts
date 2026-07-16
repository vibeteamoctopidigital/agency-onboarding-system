import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./slices/auth.slice"
import notificationReducer from "./slices/notification.slice"
import themeReducer from "./slices/theme.slice"

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      theme: themeReducer,
      notification: notificationReducer,
    },
    devTools: process.env.NODE_ENV !== "production",
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
