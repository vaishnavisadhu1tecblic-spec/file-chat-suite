import api from "./interceptors";

// Register
export const registerUser = async (data) => {
  return await api.post("/auth/register", data);
};

// Login
export const loginUser = async (data) => {
  return await api.post("/auth/login", data);
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
  return await api.put(`/auth/update/${id}`, data);
};

// Delete User
export const deleteUser = async (id) => {
  return await api.delete(`/auth/delete/${id}`);
};
