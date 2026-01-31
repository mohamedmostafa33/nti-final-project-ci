import React, { useState } from "react";
import { Button, Flex, Text } from "@chakra-ui/react";
import { ModalView } from "../../../atoms/authModalAtom";
import InputItem from "../../Layout/InputItem";
import { authAPI, saveAuthData } from "../../../api/client";
import { useSetRecoilState } from "recoil";
import { authModalState } from "../../../atoms/authModalAtom";
import { userState } from "../../../atoms/userAtom";

type LoginProps = {
  toggleView: (view: ModalView) => void;
};

const Login: React.FC<LoginProps> = ({ toggleView }) => {
  const [form, setForm] = useState({
    email: "",
    password: "",
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

    setLoading(true);
    try {
      const response = await authAPI.login({
        email: form.email,
        password: form.password,
      });
      
      saveAuthData(response.data);
      setUser(response.data.user);
      setAuthModal({ open: false, view: "login" });
    } catch (err: any) {
      setFormError(
        err.response?.data?.detail || 
        err.response?.data?.non_field_errors?.[0] ||
        "Login failed. Please check your credentials."
      );
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
        Log In
      </Button>
      <Flex justifyContent="center" mb={2}>
        <Text fontSize="9pt" color="gray.400">
          Forgot your password? Contact support.
        </Text>
      </Flex>
      <Flex fontSize="9pt" justifyContent="center">
        <Text mr={1}>New here?</Text>
        <Text
          color="blue.500"
          fontWeight={700}
          cursor="pointer"
          onClick={() => toggleView("signup")}
        >
          SIGN UP
        </Text>
      </Flex>
    </form>
  );
};
export default Login;
