import { useEffect } from "react";
import { Stack } from "@chakra-ui/react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useRecoilValue } from "recoil";
import { communityState } from "../atoms/communitiesAtom";
import { Post, PostVote } from "../atoms/postsAtom";
import CreatePostLink from "../components/Community/CreatePostLink";
import Recommendations from "../components/Community/Recommendations";
import PageContentLayout from "../components/Layout/PageContent";
import PostLoader from "../components/Post/Loader";
import PostItem from "../components/Post/PostItem";
import usePosts from "../hooks/usePosts";
import Premium from "../components/Community/Premium";
import PersonalHome from "../components/Community/PersonalHome";
import { postsAPI } from "../api/client";
import { userState } from "../atoms/userAtom";

const Home: NextPage = () => {
  const user = useRecoilValue(userState);
  const {
    postStateValue,
    setPostStateValue,
    onVote,
    onSelectPost,
    onDeletePost,
    loading,
    setLoading,
  } = usePosts();
  const communityStateValue = useRecoilValue(communityState);

  const getUserHomePosts = async () => {
    console.log("GETTING USER FEED");
    setLoading(true);
    try {
      const feedPosts: Post[] = [];

      // User has joined communities
      if (communityStateValue.mySnippets.length) {
        console.log("GETTING POSTS IN USER COMMUNITIES");

        const myCommunityIds = communityStateValue.mySnippets.map(
          (snippet) => snippet.communityId
        );

        // Get posts from user's communities (up to 5 communities, 4 posts each = 20 posts max)
        const postPromises = myCommunityIds.slice(0, 5).map((communityId) =>
          postsAPI.list(communityId, 4)
        );

        const results = await Promise.all(postPromises);
        results.forEach((posts) => {
          const formattedPosts = posts.map((post: any) => ({
            id: post.id,
            communityId: post.communityId,
            creatorId: post.creatorId?.toString() || "",
            creatorDisplayName: post.creatorDisplayText || "Unknown",
            userDisplayText: post.creatorDisplayText || "Unknown",
            title: post.title,
            body: post.body || "",
            numberOfComments: post.numberOfComments || 0,
            voteStatus: post.voteStatus || 0,
            imageURL: post.imageURL || "",
            communityImageURL: post.communityImageURL || "",
            createdAt: new Date(post.createdAt).getTime(),
          })) as Post[];
          feedPosts.push(...formattedPosts);
        });
        
        // Sort all posts by creation date (newest first)
        feedPosts.sort((a, b) => b.createdAt - a.createdAt);
      }
      // User has not joined any communities yet
      else {
        console.log("USER HAS NO COMMUNITIES - GETTING GENERAL POSTS");

        // Get general feed (top 20 posts from all communities)
        const posts = await postsAPI.getFeed(20);
        const formattedPosts = posts.map((post: any) => ({
          id: post.id,
          communityId: post.communityId,
          creatorId: post.creatorId?.toString() || "",
          creatorDisplayName: post.creatorDisplayText || "Unknown",
          userDisplayText: post.creatorDisplayText || "Unknown",
          title: post.title,
          body: post.body || "",
          numberOfComments: post.numberOfComments || 0,
          voteStatus: post.voteStatus || 0,
          imageURL: post.imageURL || "",
          communityImageURL: post.communityImageURL || "",
          createdAt: new Date(post.createdAt).getTime(),
        })) as Post[];
        feedPosts.push(...formattedPosts);
      }

      console.log("HERE ARE FEED POSTS", feedPosts);

      setPostStateValue((prev) => ({
        ...prev,
        posts: feedPosts,
      }));
    } catch (error: any) {
      console.log("getUserHomePosts error", error);
    }
    setLoading(false);
  };

  const getNoUserHomePosts = async () => {
    console.log("GETTING NO USER FEED");
    setLoading(true);
    try {
      // Get top 20 posts for non-authenticated users
      const posts = await postsAPI.getFeed(20);
      const formattedPosts = posts.map((post: any) => ({
        id: post.id,
        communityId: post.communityId,
        creatorId: post.creatorId?.toString() || "",
        creatorDisplayName: post.creatorDisplayText || "Unknown",
        userDisplayText: post.creatorDisplayText || "Unknown",
        title: post.title,
        body: post.body || "",
        numberOfComments: post.numberOfComments || 0,
        voteStatus: post.voteStatus || 0,
        imageURL: post.imageURL || "",
        communityImageURL: post.communityImageURL || "",
        createdAt: new Date(post.createdAt).getTime(),
      }));

      console.log("NO USER FEED", formattedPosts);

      setPostStateValue((prev) => ({
        ...prev,
        posts: formattedPosts as Post[],
      }));
    } catch (error: any) {
      console.log("getNoUserHomePosts error", error);
    }
    setLoading(false);
  };

  const getUserPostVotes = async () => {
    if (!user || postStateValue.posts.length === 0) return;

    try {
      const postIds = postStateValue.posts.map((post) => post.id);
      
      // For each post, check if user has voted
      // Note: This is not optimal - ideally backend should support batch vote fetching
      const votes: PostVote[] = [];
      
      for (const postId of postIds) {
        try {
          const postData = await postsAPI.getById(postId);
          // If post has user's vote, add it
          // TODO: Backend should return current user's vote with post data
        } catch (err) {
          // Skip if post not found
        }
      }

      setPostStateValue((prev) => ({
        ...prev,
        postVotes: votes,
      }));
    } catch (error) {
      console.log("getUserPostVotes error", error);
    }
  };

  useEffect(() => {
    if (!communityStateValue.initSnippetsFetched) return;

    if (user) {
      getUserHomePosts();
    }
  }, [user?.id, communityStateValue.initSnippetsFetched]);

  useEffect(() => {
    if (!user) {
      getNoUserHomePosts();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user || !postStateValue.posts.length) return;
    getUserPostVotes();
  }, [user?.id, postStateValue.posts.length]);

  return (
    <PageContentLayout>
      <>
        <CreatePostLink />
        {loading ? (
          <PostLoader />
        ) : (
          <Stack>
            {postStateValue.posts.map((post: Post, index) => (
              <PostItem
                key={post.id}
                post={post}
                postIdx={index}
                onVote={onVote}
                onDeletePost={onDeletePost}
                userVoteValue={
                  postStateValue.postVotes.find(
                    (item) => item.postId === post.id
                  )?.voteValue
                }
                userIsCreator={user?.id?.toString() === post.creatorId}
                onSelectPost={onSelectPost}
                homePage
              />
            ))}
          </Stack>
        )}
      </>
      <Stack spacing={5} position="sticky" top="14px">
        <Recommendations />
        <Premium />
        <PersonalHome />
      </Stack>
    </PageContentLayout>
  );
};

export default Home;
