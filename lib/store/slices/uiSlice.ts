import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  sidebarOpen: boolean;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
}

const initialState: UiState = {
  sidebarOpen: true,
  highContrast: false,
  largeText: false,
  reducedMotion: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setAccessibility(state, action: PayloadAction<Partial<UiState>>) {
      Object.assign(state, action.payload);
    },
  },
});

export const { toggleSidebar, setAccessibility } = uiSlice.actions;
export default uiSlice.reducer;
