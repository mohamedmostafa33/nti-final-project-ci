import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Flex,
  SkeletonCircle,
  SkeletonText,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useSetRecoilState } from "recoil";
import { authModalState } from "../../../atoms/authModalAtom";
import { Post, postState } from "../../../atoms/postsAtom";
import CommentItem, { Comment } from "./CommentItem";
import CommentInput from "./Input";
import { commentsAPI } from "../../../api/client";

type CommentsProps = {
  user?: any | null;
  selectedPost: Post;
  community: string;
};

const Comments: React.FC<CommentsProps> = ({
  user,
  selectedPost,
  community,
}) => {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentFetchLoading, setCommentFetchLoading] = useState(false);
  const [commentCreateLoading, setCommentCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState("");
  const setAuthModalState = useSetRecoilState(authModalState);
  const setPostState = useSetRecoilState(postState);

  const onCreateComment = async (comment: string) => {
    if (!user) {
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    setCommentCreateLoading(true);
    try {
      // Create comment via Django API
      const newComment = await commentsAPI.create({
        post_id: selectedPost.id,
        community_id: community,
        text: comment,
      });

      setComment("");
      
      // Add new comment to state
      setComments((prev) => [
        {
          id: newComment.id.toString(),
          creatorId: newComment.creatorId.toString(),
          creatorDisplayText: newComment.creatorDisplayText || "Unknown",
          creatorPhotoURL: newComment.creatorPhotoURL || "",
          communityId: community,
          postId: selectedPost.id.toString(),
          postTitle: selectedPost.title,
          text: comment,
          createdAt: {
            seconds: new Date(newComment.createdAt).getTime() / 1000,
          },
        } as Comment,
        ...prev,
      ]);

      // Update post state
      setPostState((prev) => ({
        ...prev,
        selectedPost: {
          ...prev.selectedPost,
          numberOfComments: prev.selectedPost?.numberOfComments! + 1,
        } as Post,
        postUpdateRequired: true,
      }));
    } catch (error: any) {
      console.log("onCreateComment error", error);
    }
    setCommentCreateLoading(false);
  };

  const onDeleteComment = useCallback(
    async (comment: Comment) => {
      setDeleteLoading(comment.id as string);
      try {
        if (!comment.id) throw "Comment has no ID";
        
        // Delete comment via Django API
        await commentsAPI.delete(parseInt(comment.id));

        setPostState((prev) => ({
          ...prev,
          selectedPost: {
            ...prev.selectedPost,
            numberOfComments: prev.selectedPost?.numberOfComments! - 1,
          } as Post,
          postUpdateRequired: true,
        }));

        setComments((prev) => prev.filter((item) => item.id !== comment.id));
      } catch (error: any) {
        console.log("Error deleting comment", error);
      }
      setDeleteLoading("");
    },
    [setComments, setPostState]
  );

  const getPostComments = async () => {
    try {
      // Fetch comments from Django API
      const commentsData = await commentsAPI.list(selectedPost.id);
      
      const comments: Comment[] = commentsData.map((comment: any) => ({
        id: comment.id.toString(),
        creatorId: comment.creatorId.toString(),
        creatorDisplayText: comment.creatorDisplayText || "Unknown",
        creatorPhotoURL: comment.creatorPhotoURL || "",
        communityId: comment.communityId,
        postId: comment.postId.toString(),
        postTitle: selectedPost.title,
        text: comment.text,
        createdAt: {
          seconds: new Date(comment.createdAt).getTime() / 1000,
        },
      }));
      
      setComments(comments);
    } catch (error: any) {
      console.log("getPostComments error", error);
    }
    setCommentFetchLoading(false);
  };

  useEffect(() => {
    console.log("HERE IS SELECTED POST", selectedPost.id);

    getPostComments();
  }, []);

  return (
    <Box bg="white" p={2} borderRadius="0px 0px 4px 4px">
      <Flex
        direction="column"
        pl={10}
        pr={4}
        mb={6}
        fontSize="10pt"
        width="100%"
      >
        <CommentInput
          comment={comment}
          setComment={setComment}
          loading={commentCreateLoading}
          user={user}
          onCreateComment={onCreateComment}
        />
      </Flex>
      <Stack spacing={6} p={2}>
        {commentFetchLoading ? (
          <>
            {[0, 1, 2].map((item) => (
              <Box key={item} padding="6" bg="white">
                <SkeletonCircle size="10" />
                <SkeletonText mt="4" noOfLines={2} spacing="4" />
              </Box>
            ))}
          </>
        ) : (
          <>
            {!!comments.length ? (
              <>
                {comments.map((item: Comment) => (
                  <CommentItem
                    key={item.id}
                    comment={item}
                    onDeleteComment={onDeleteComment}
                    isLoading={deleteLoading === (item.id as string)}
                    userId={user?.id?.toString()}
                  />
                ))}
              </>
            ) : (
              <Flex
                direction="column"
                justify="center"
                align="center"
                borderTop="1px solid"
                borderColor="gray.100"
                p={20}
              >
                <Text fontWeight={700} opacity={0.3}>
                  No Comments Yet
                </Text>
              </Flex>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
};
export default Comments;
