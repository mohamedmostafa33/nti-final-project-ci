import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Stack,
  Textarea,
  Image,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { BiPoll } from "react-icons/bi";
import { BsLink45Deg, BsMic } from "react-icons/bs";
import { IoDocumentText, IoImageOutline } from "react-icons/io5";
import { AiFillCloseCircle } from "react-icons/ai";
import { useSetRecoilState } from "recoil";
import TabItemComponent from "./TabItem";
import { postState } from "../../../atoms/postsAtom";
import TextInputs from "./TextInputs";
import ImageUpload from "./ImageUpload";
import { postsAPI } from "../../../api/client";

const formTabs = [
  {
    title: "Post",
    icon: IoDocumentText,
  },
  {
    title: "Images & Video",
    icon: IoImageOutline,
  },
  {
    title: "Link",
    icon: BsLink45Deg,
  },
  {
    title: "Poll",
    icon: BiPoll,
  },
  {
    title: "Talk",
    icon: BsMic,
  },
];

export type TabItem = {
  title: string;
  icon: typeof Icon.arguments;
};

type NewPostFormProps = {
  communityId: string;
  communityImageURL?: string;
  user: any; // Changed from User (Firebase type)
};

const NewPostForm: React.FC<NewPostFormProps> = ({
  communityId,
  communityImageURL,
  user,
}) => {
  const [selectedTab, setSelectedTab] = useState(formTabs[0].title);
  const [textInputs, setTextInputs] = useState({
    title: "",
    body: "",
  });
  const [selectedFile, setSelectedFile] = useState<string>();
  const [selectedImageFile, setSelectedImageFile] = useState<File>();
  const selectFileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const setPostItems = useSetRecoilState(postState);

  const handleCreatePost = async () => {
    setLoading(true);
    const { title, body } = textInputs;
    try {
      // Create post via Django API
      const newPost = await postsAPI.create({
        community_id: communityId,
        title,
        body,
        image: selectedImageFile, // Send actual File object
        image_url: !selectedImageFile ? selectedFile : undefined, // Fallback to base64 if no file
      });

      console.log("HERE IS NEW POST ID", newPost.id);

      // Clear the cache to cause a refetch of the posts
      setPostItems((prev) => ({
        ...prev,
        postUpdateRequired: true,
        postsCache: {}, // Clear entire cache to force refetch
      }));
      
      // Navigate back to community page
      router.push(`/r/${communityId}`);
    } catch (error: any) {
      console.log("createPost error", error);
      setError(error.response?.data?.detail || "Error creating post");
    }
    setLoading(false);
  };

  const onSelectImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Store the actual File object for upload
    setSelectedImageFile(file);
    
    // Create object URL for preview (better than base64)
    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(objectUrl);
  };

  const onTextChange = ({
    target: { name, value },
  }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTextInputs((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Flex direction="column" bg="white" borderRadius={4} mt={2}>
      <Flex width="100%">
        {formTabs.map((item, index) => (
          <TabItemComponent
            key={index}
            item={item}
            selected={item.title === selectedTab}
            setSelectedTab={setSelectedTab}
          />
        ))}
      </Flex>
      <Flex p={4}>
        {selectedTab === "Post" && (
          <TextInputs
            textInputs={textInputs}
            onChange={onTextChange}
            handleCreatePost={handleCreatePost}
            loading={loading}
          />
        )}
        {selectedTab === "Images & Video" && (
          <ImageUpload
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            setSelectedTab={setSelectedTab}
            selectFileRef={selectFileRef}
            onSelectImage={onSelectImage}
          />
        )}
      </Flex>
    </Flex>
  );
};
export default NewPostForm;
