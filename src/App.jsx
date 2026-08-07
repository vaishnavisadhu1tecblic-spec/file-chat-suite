import "./App.css";
import AppRoutes from "./routes/AppRoutes";
import { GoogleOAuthProvider } from "@react-oauth/google";

console.log("ENV =", import.meta.env);
console.log("CLIENT ID =", import.meta.env.VITE_GOOGLE_CLIENT_ID);

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AppRoutes />
    </GoogleOAuthProvider>
  );
}

export default App;
