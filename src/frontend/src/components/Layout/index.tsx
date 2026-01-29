import React from "react";
import { useAuthState } from "../../hooks/useAuthCompat";
import useAuth from "../../hooks/useAuth";
import Navbar from "../Navbar";
import AuthModal from "../Modal/Auth";

const Layout: React.FC = ({ children }) => {
  useAuth(); // Load user on mount

  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

export default Layout;
