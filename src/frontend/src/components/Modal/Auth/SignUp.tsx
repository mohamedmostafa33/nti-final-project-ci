import React, { useState } from "react";
import { Button, Flex, Text } from "@chakra-ui/react";
import { ModalView } from "../../../atoms/authModalAtom";
import InputItem from "../../Layout/InputItem";
import { authAPI, saveAuthData } from "../../../api/client";
import { useSetRecoilState } from "recoil";
import { authModalState } from "../../../atoms/authModalAtom";
import { userState } from "../../../atoms/userAtom";

type SignUpProps = {
  toggleView: (view: ModalView) => void;
};

const SignUp: React.FC<SignUpProps> = ({ toggleView }) => {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuthModal = useSetRecoilState(authModalState);
  const setUser = useSetRecoilState(userState);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formError) setFormError("");
    if (!form.email.includes("@")) {
      return setFormError("Please enter a valid email");
    }

    if (form.password !== form.confirmPassword) {
      return setFormError("Passwords do not match");
    }

    if (form.password.length < 6) {
      return setFormError("Password must be at least 6 characters");
    }

    setLoading(true);
    try {
      const response = await authAPI.register({
        email: form.email,
        username: form.email.split("@")[0],
        password: form.password,
        password2: form.confirmPassword,
      });
      
      saveAuthData(response.data);
      setUser(response.data.user);
      setAuthModal({ open: false, view: "login" });
    } catch (err: any) {
      const errorMsg = 
        err.response?.data?.email?.[0] ||
        err.response?.data?.password?.[0] ||
        err.response?.data?.detail ||
        "Registration failed. Please try again.";
      setFormError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onChange = ({
    target: { name, value },
  }: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form onSubmit={onSubmit}>
      <InputItem
        name="email"
        placeholder="email"
        type="text"
        mb={2}
        onChange={onChange}
      />
      <InputItem
        name="password"
        placeholder="password"
        type="password"
        mb={2}
        onChange={onChange}
      />
      <InputItem
        name="confirmPassword"
        placeholder="confirm password"
        type="password"
        onChange={onChange}
      />
      <Text textAlign="center" mt={2} fontSize="10pt" color="red">
        {formError}
      </Text>
      <Button
        width="100%"
        height="36px"
        mb={2}
        mt={2}
        type="submit"
        isLoading={loading}
      >
        Sign Up
      </Button>
      <Flex fontSize="9pt" justifyContent="center">
        <Text mr={1}>Have an account?</Text>
        <Text
          color="blue.500"
          fontWeight={700}
          cursor="pointer"
          onClick={() => toggleView("login")}
        >
          LOG IN
        </Text>
      </Flex>
    </form>
  );
};
export default SignUp;
