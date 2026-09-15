import api from "./interceptors";

// Register
export const registerUser = async (data) => {
  return await api.post("/auth/register", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// Login
export const loginUser = async (data) => {
  return await api.post("/auth/login", data);
};

// Password reset
export const requestPasswordReset = async (email) => {
  return await api.post("/auth/forgot-password", { email });
};

export const resetPassword = async (token, data) => {
  return await api.post("/auth/reset-password", {
    token,
    ...data,
  });
};

export const validateResetToken = async (token) => {
  return await api.get(`/auth/reset-password/${token}`);
};

// Get All Users
export const getUsers = async () => {
  return await api.get("/auth/users");
};

// Get Single User
export const getUser = async (id) => {
  return await api.get(`/auth/user/${id}`);
};

// Update User
export const updateUser = async (id, data) => {
  return await api.put(`/auth/update/${id}`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// Delete User
export const deleteUser = async (id) => {
  return await api.delete(`/auth/delete/${id}`);
};
