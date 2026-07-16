import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { User } from "@/types"

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
    patchUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) state.user = { ...state.user, ...action.payload }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
    logout(state) {
      state.user = null
      state.isAuthenticated = false
    },
  },
})

export const { setUser, patchUser, setLoading, logout } = authSlice.actions
export default authSlice.reducer
