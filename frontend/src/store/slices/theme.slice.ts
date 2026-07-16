import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

type Theme = "light" | "dark" | "system"

interface ThemeState {
  theme: Theme
  sidebarOpen: boolean
}

const initialState: ThemeState = {
  theme: "system",
  sidebarOpen: true,
}

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
  },
})

export const { setTheme, toggleSidebar, setSidebarOpen } = themeSlice.actions
export default themeSlice.reducer
