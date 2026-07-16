import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface Notification {
  id: string
  message: string
  type: "info" | "success" | "warning" | "error"
  read: boolean
  createdAt: string
}

interface NotificationState {
  items: Notification[]
  unreadCount: number
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
}

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<Notification>) {
      state.items.unshift(action.payload)
      if (!action.payload.read) {
        state.unreadCount++
      }
    },
    markAsRead(state, action: PayloadAction<string>) {
      const notification = state.items.find((n) => n.id === action.payload)
      if (notification && !notification.read) {
        notification.read = true
        state.unreadCount--
      }
    },
    setNotifications(state, action: PayloadAction<Notification[]>) {
      state.items = action.payload
      state.unreadCount = action.payload.filter((n) => !n.read).length
    },
    clearNotifications(state) {
      state.items = []
      state.unreadCount = 0
    },
  },
})

export const { addNotification, markAsRead, setNotifications, clearNotifications } =
  notificationSlice.actions
export default notificationSlice.reducer
