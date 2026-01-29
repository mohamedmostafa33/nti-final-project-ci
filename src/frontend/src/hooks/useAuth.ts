import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { userState } from "../atoms/userAtom";
import { authAPI, getCurrentUser } from "../api/client";

const useAuth = () => {
  const [currentUser, setCurrentUser] = useRecoilState(userState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const user = getCurrentUser();
    
    if (user) {
      setCurrentUser(user);
      
      // Verify token is still valid by fetching profile
      authAPI.getProfile()
        .then(response => {
          setCurrentUser(response.data);
        })
        .catch(() => {
          // Token invalid, clear auth data
          setCurrentUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  return { user: currentUser, loading };
};

export default useAuth;

