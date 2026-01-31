import React, { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { authModalState } from "../atoms/authModalAtom";
import { Community, communityState } from "../atoms/communitiesAtom";
import { Post, postState, PostVote } from "../atoms/postsAtom";
import { useRouter } from "next/router";
import { postsAPI } from "../api/client";
import { userState } from "../atoms/userAtom";

const usePosts = (communityData?: Community) => {
  const user = useRecoilValue(userState);
  const [postStateValue, setPostStateValue] = useRecoilState(postState);
  const setAuthModalState = useSetRecoilState(authModalState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const communityStateValue = useRecoilValue(communityState);

  const onSelectPost = (post: Post, postIdx: number) => {
    console.log("HERE IS STUFF", post, postIdx);

    setPostStateValue((prev) => ({
      ...prev,
      selectedPost: { ...post, postIdx },
    }));
    router.push(`/r/${post.communityId}/comments/${post.id}`);
  };

  const onVote = async (
    event: React.MouseEvent<SVGElement, MouseEvent>,
    post: Post,
    vote: number,
    communityId: string
  ) => {
    event.stopPropagation();
    if (!user) {
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    const { voteStatus } = post;
    const existingVote = postStateValue.postVotes.find(
      (v) => v.postId === post.id
    );

    try {
      let voteChange = vote;
      const updatedPost = { ...post };
      const updatedPosts = [...postStateValue.posts];
      let updatedPostVotes = [...postStateValue.postVotes];

      // New vote
      if (!existingVote) {
        // Call API to create vote
        const newVoteData = await postsAPI.vote(post.id, communityId, vote);
        
        const newVote: PostVote = {
          id: newVoteData.id.toString(),
          postId: post.id,
          communityId,
          voteValue: vote,
        };

        updatedPost.voteStatus = voteStatus + vote;
        updatedPostVotes = [...updatedPostVotes, newVote];
      }
      // Removing or changing existing vote
      else {
        // Removing vote (clicking same button)
        if (existingVote.voteValue === vote) {
          // Call API to remove vote (send same value to toggle)
          await postsAPI.vote(post.id, communityId, vote);
          
          voteChange = -vote;
          updatedPost.voteStatus = voteStatus - vote;
          updatedPostVotes = updatedPostVotes.filter(
            (v) => v.id !== existingVote.id
          );
        }
        // Changing vote (clicking opposite button)
        else {
          // Call API to update vote
          await postsAPI.vote(post.id, communityId, vote);
          
          voteChange = 2 * vote;
          updatedPost.voteStatus = voteStatus + 2 * vote;
          const voteIdx = postStateValue.postVotes.findIndex(
            (v) => v.id === existingVote.id
          );

          if (voteIdx !== -1) {
            updatedPostVotes[voteIdx] = {
              ...existingVote,
              voteValue: vote,
            };
          }
        }
      }

      // Update state
      let updatedState = { ...postStateValue, postVotes: updatedPostVotes };

      const postIdx = postStateValue.posts.findIndex(
        (item) => item.id === post.id
      );

      if (postIdx !== -1) {
        updatedPosts[postIdx] = updatedPost;
        updatedState = {
          ...updatedState,
          posts: updatedPosts,
          postsCache: {
            ...updatedState.postsCache,
            [communityId]: updatedPosts,
          },
        };
      }

      // Update selected post if exists
      if (updatedState.selectedPost) {
        updatedState = {
          ...updatedState,
          selectedPost: updatedPost,
        };
      }

      // Optimistically update the UI
      setPostStateValue(updatedState);
    } catch (error: any) {
      console.log("onVote error", error);
      setError(error.response?.data?.detail || "Error voting on post");
    }
  };

  const onDeletePost = async (post: Post): Promise<boolean> => {
    console.log("DELETING POST: ", post.id);

    try {
      // Delete post via API
      await postsAPI.delete(post.id);

      // Update post state
      setPostStateValue((prev) => ({
        ...prev,
        posts: prev.posts.filter((item) => item.id !== post.id),
        postsCache: {
          ...prev.postsCache,
          [post.communityId]: prev.postsCache[post.communityId]?.filter(
            (item) => item.id !== post.id
          ),
        },
      }));

      return true;
    } catch (error) {
      console.log("THERE WAS AN ERROR", error);
      return false;
    }
  };

  const getCommunityPostVotes = async (communityId: string) => {
    if (!user) return;
    
    try {
      // Fetch user's votes for posts in this community
      const votes = await postsAPI.getUserVotes(communityId);
      
      const postVotes: PostVote[] = votes.map((vote: any) => ({
        id: vote.id.toString(),
        postId: vote.postId, // Updated from backend
        communityId: vote.communityId, // Updated from backend
        voteValue: vote.voteValue, // Updated from backend
      }));

      setPostStateValue((prev) => ({
        ...prev,
        postVotes,
      }));
    } catch (error) {
      console.log("Error fetching post votes", error);
    }
  };

  useEffect(() => {
    if (!user || !communityStateValue.currentCommunity || !communityStateValue.currentCommunity.id) return;
    getCommunityPostVotes(communityStateValue.currentCommunity.id);
  }, [user, communityStateValue.currentCommunity]);

  useEffect(() => {
    // Logout or no authenticated user
    if (!user) {
      setPostStateValue((prev) => ({
        ...prev,
        postVotes: [],
      }));
      return;
    }
  }, [user]);

  return {
    postStateValue,
    setPostStateValue,
    onSelectPost,
    onDeletePost,
    loading,
    setLoading,
    onVote,
    error,
  };
};

export default usePosts;
