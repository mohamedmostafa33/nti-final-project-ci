import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Flex,
  Icon,
  Skeleton,
  SkeletonCircle,
  Stack,
  Text,
  Image,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { RiCakeLine } from "react-icons/ri";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuthState } from "../../hooks/useAuthCompat";
import { Community, communityState } from "../../atoms/communitiesAtom";
import moment from "moment";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { FaReddit } from "react-icons/fa";
import { communitiesAPI } from "../../api/client";

type AboutProps = {
  communityData: Community;
  pt?: number;
  onCreatePage?: boolean;
  loading?: boolean;
};

const About: React.FC<AboutProps> = ({
  communityData,
  pt,
  onCreatePage,
  loading,
}) => {
  const [user] = useAuthState(); // will revisit how 'auth' state is passed
  const router = useRouter();
  const selectFileRef = useRef<HTMLInputElement>(null);
  const setCommunityStateValue = useSetRecoilState(communityState);
  const toast = useToast();

  // April 24 - moved this logic to custom hook in tutorial build (useSelectFile)
  const [selectedFile, setSelectedFile] = useState<string>();
  const [selectedImageFile, setSelectedImageFile] = useState<File>();

  // Added last!
  const [imageLoading, setImageLoading] = useState(false);

  const onSelectImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Store the actual File object for upload
    setSelectedImageFile(file);
    
    // Create object URL for preview (better than base64)
    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(objectUrl);
  };

  const updateImage = async () => {
    if (!selectedFile && !selectedImageFile) return;
    setImageLoading(true);
    try {
      // Update backend with new image
      const updatedCommunity = await communitiesAPI.update(communityData.id, {
        image: selectedImageFile, // Send actual File object
        image_url: !selectedImageFile ? selectedFile : undefined, // Fallback to base64 if no file
      });
      
      // Update local state for current community with the URL from backend
      const newImageURL = updatedCommunity.imageURL || selectedFile;
      setCommunityStateValue((prev) => ({
        ...prev,
        currentCommunity: {
          ...prev.currentCommunity!,
          imageURL: newImageURL,
        },
        // Also update the snippet if user is a member
        mySnippets: prev.mySnippets.map((snippet) =>
          snippet.communityId === communityData.id
            ? { ...snippet, imageURL: newImageURL }
            : snippet
        ),
      }));
      
      toast({
        title: "Success",
        description: "Community image updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      setSelectedFile(undefined);
      setSelectedImageFile(undefined);
    } catch (error: any) {
      console.log("updateImage error", error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to update image",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
    setImageLoading(false);
  };

  return (
    <Box pt={pt} position="sticky" top="14px">
      <Flex
        justify="space-between"
        align="center"
        p={3}
        color="white"
        bg="blue.400"
        borderRadius="4px 4px 0px 0px"
      >
        <Text fontSize="10pt" fontWeight={700}>
          About Community
        </Text>
        <Icon as={HiOutlineDotsHorizontal} cursor="pointer" />
      </Flex>
      <Flex direction="column" p={3} bg="white" borderRadius="0px 0px 4px 4px">
        {loading ? (
          <Stack mt={2}>
            <SkeletonCircle size="10" />
            <Skeleton height="10px" />
            <Skeleton height="20px" />
            <Skeleton height="20px" />
            <Skeleton height="20px" />
          </Stack>
        ) : (
          <>
            {user?.uid === communityData?.creatorId && (
              <Box
                bg="gray.100"
                width="100%"
                p={2}
                borderRadius={4}
                border="1px solid"
                borderColor="gray.300"
                cursor="pointer"
              >
                <Text fontSize="9pt" fontWeight={700} color="blue.500">
                  Add description
                </Text>
              </Box>
            )}
            <Stack spacing={2}>
              <Flex width="100%" p={2} fontWeight={600} fontSize="10pt">
                <Flex direction="column" flexGrow={1}>
                  <Text>
                    {communityData?.numberOfMembers?.toLocaleString()}
                  </Text>
                  <Text>Members</Text>
                </Flex>
                <Flex direction="column" flexGrow={1}>
                  <Text>1</Text>
                  <Text>Online</Text>
                </Flex>
              </Flex>
              <Divider />
              <Flex
                align="center"
                width="100%"
                p={1}
                fontWeight={500}
                fontSize="10pt"
              >
                <Icon as={RiCakeLine} mr={2} fontSize={18} />
                {communityData?.createdAt && (
                  <Text>
                    Created{" "}
                    {moment(
                      typeof communityData.createdAt === 'string' 
                        ? new Date(communityData.createdAt) 
                        : new Date(communityData.createdAt * 1000)
                    ).format("MMM DD, YYYY")}
                  </Text>
                )}
              </Flex>
              {!onCreatePage && (
                <Link href={`/r/${router.query.community}/submit`}>
                  <Button mt={3} height="30px">
                    Create Post
                  </Button>
                </Link>
              )}
              {/* !!!ADDED AT THE VERY END!!! INITIALLY DOES NOT EXIST */}
              {user?.id?.toString() === communityData?.creatorId && (
                <>
                  <Divider />
                  <Stack fontSize="10pt" spacing={1}>
                    <Text fontWeight={600}>Admin</Text>
                    <Flex align="center" justify="space-between">
                      <Text
                        color="blue.500"
                        cursor="pointer"
                        _hover={{ textDecoration: "underline" }}
                        onClick={() => selectFileRef.current?.click()}
                      >
                        Change Image
                      </Text>
                      {communityData?.imageURL || selectedFile ? (
                        <Image
                          borderRadius="full"
                          boxSize="40px"
                          src={selectedFile || communityData?.imageURL}
                          alt="Community Image"
                        />
                      ) : (
                        <Icon
                          as={FaReddit}
                          fontSize={40}
                          color="brand.100"
                          mr={2}
                        />
                      )}
                    </Flex>
                    {selectedFile &&
                      (imageLoading ? (
                        <Spinner />
                      ) : (
                        <Text cursor="pointer" onClick={updateImage}>
                          Save Changes
                        </Text>
                      ))}
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/x-png,image/gif,image/jpeg"
                      hidden
                      ref={selectFileRef}
                      onChange={onSelectImage}
                    />
                  </Stack>
                </>
              )}
            </Stack>
          </>
        )}
      </Flex>
    </Box>
  );
};
export default About;
