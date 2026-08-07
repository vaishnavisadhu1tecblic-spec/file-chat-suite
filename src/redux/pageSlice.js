import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  showHidePage: true,
};

const pageSlice = createSlice({
  name: "page",
  initialState,
  reducers: {
    showLogin: (state) => {
      state.showHidePage = true;
    },
    showRegister: (state) => {
      state.showHidePage = false;
    },
  },
});

export const { showLogin, showRegister } = pageSlice.actions;

export default pageSlice.reducer;
