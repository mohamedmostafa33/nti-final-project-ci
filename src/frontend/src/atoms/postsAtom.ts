import { atom } from "recoil";

export type Post = {
  id: number; // Changed from string to number for Django API
  communityId: string;
  communityImageURL?: string;
  userDisplayText: string; // change to authorDisplayText
  creatorId: string;
  creatorDisplayName?: string;
  title: string;
  body: string;
  numberOfComments: number;
  voteStatus: number;
  currentUserVoteStatus?: {
    id: string;
    voteValue: number;
  };
  imageURL?: string;
  postIdx?: number;
  createdAt?: number; // Changed from Timestamp to number (epoch milliseconds)
  editedAt?: number;
};

export type PostVote = {
  id?: string;
  postId: number; // Changed from string to number
  communityId: string;
  voteValue: number;
};

interface PostState {
  selectedPost: Post | null;
  posts: Post[];
  postVotes: PostVote[];
  postsCache: {
    [key: string]: Post[];
  };
  postUpdateRequired: boolean;
}

export const defaultPostState: PostState = {
  selectedPost: null,
  posts: [],
  postVotes: [],
  postsCache: {},
  postUpdateRequired: true,
};

let postStateKey = "postState";
if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
  postStateKey = `postState_${Date.now()}`;
}

export const postState = atom({
  key: postStateKey,
  default: defaultPostState,
});
