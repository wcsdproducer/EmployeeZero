"use client";

import { useState } from "react";
import { 
  Twitter, 
  Linkedin, 
  Instagram, 
  Facebook, 
  MessageCircle, 
  Heart, 
  Repeat2, 
  Share,
  Send,
  MoreHorizontal,
  Bookmark
} from "lucide-react";
import { Button } from "./ui/button";

export interface SocialPostData {
  platform: "twitter" | "linkedin" | "instagram" | "facebook";
  content: string;
  authorName?: string;
  authorHandle?: string;
  authorImage?: string;
  postImage?: string;
}

interface SocialPostPreviewProps {
  post: SocialPostData;
  onPost?: () => void;
}

export function SocialPostPreview({ post, onPost }: SocialPostPreviewProps) {
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    setIsPosting(true);
    // Simulate API call to actual backend endpoints
    if (onPost) {
      await onPost();
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    setIsPosting(false);
  };

  const authorName = post.authorName || "Employee Zero";
  const authorHandle = post.authorHandle || "@employee_zero";
  const authorImage = post.authorImage || "https://ui-avatars.com/api/?name=E+Z&background=random";

  const renderTwitter = () => (
    <div className="bg-white text-black p-4 rounded-xl border border-neutral-200 shadow-sm max-w-[400px] w-full font-sans">
      <div className="flex gap-3">
        <img src={authorImage} alt="Avatar" className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm hover:underline cursor-pointer">{authorName}</span>
              <span className="text-neutral-500 text-sm">{authorHandle}</span>
              <span className="text-neutral-500 text-sm">· 1m</span>
            </div>
            <MoreHorizontal size={16} className="text-neutral-500" />
          </div>
          
          <div className="mt-1 text-[15px] whitespace-pre-wrap leading-snug">
            {post.content}
          </div>

          {post.postImage && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-neutral-200">
              <img src={post.postImage} alt="Post media" className="w-full h-auto object-cover" />
            </div>
          )}

          <div className="flex items-center justify-between mt-3 text-neutral-500 pr-4">
            <div className="flex items-center gap-2 hover:text-blue-500 cursor-pointer">
              <MessageCircle size={16} />
              <span className="text-xs">0</span>
            </div>
            <div className="flex items-center gap-2 hover:text-green-500 cursor-pointer">
              <Repeat2 size={16} />
              <span className="text-xs">0</span>
            </div>
            <div className="flex items-center gap-2 hover:text-pink-500 cursor-pointer">
              <Heart size={16} />
              <span className="text-xs">0</span>
            </div>
            <div className="flex items-center gap-2 hover:text-blue-500 cursor-pointer">
              <BarChartIcon />
              <span className="text-xs">0</span>
            </div>
            <div className="flex items-center gap-2 hover:text-blue-500 cursor-pointer">
              <Share size={16} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLinkedIn = () => (
    <div className="bg-white text-black p-4 rounded-lg border border-neutral-200 shadow-sm max-w-[400px] w-full font-sans">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <img src={authorImage} alt="Avatar" className="w-12 h-12 rounded-full" />
          <div className="flex flex-col justify-center">
            <span className="font-bold text-[15px] hover:text-blue-600 hover:underline cursor-pointer leading-tight">{authorName}</span>
            <span className="text-neutral-500 text-xs line-clamp-1">AI Automation Specialist | Employee Zero</span>
            <span className="text-neutral-500 text-xs flex items-center gap-1">1m · 🌐</span>
          </div>
        </div>
        <MoreHorizontal size={20} className="text-neutral-500" />
      </div>

      <div className="mt-3 text-[14px] whitespace-pre-wrap leading-relaxed">
        {post.content}
      </div>

      {post.postImage && (
        <div className="mt-3 -mx-4 bg-neutral-100">
          <img src={post.postImage} alt="Post media" className="w-full h-auto max-h-[400px] object-cover" />
        </div>
      )}

      <div className="flex items-center justify-between mt-1 pt-2 border-t border-neutral-200 text-neutral-500">
        <div className="flex items-center gap-1.5 hover:bg-neutral-100 p-2 rounded-md cursor-pointer flex-1 justify-center">
          <Heart size={18} />
          <span className="text-sm font-semibold">Like</span>
        </div>
        <div className="flex items-center gap-1.5 hover:bg-neutral-100 p-2 rounded-md cursor-pointer flex-1 justify-center">
          <MessageCircle size={18} />
          <span className="text-sm font-semibold">Comment</span>
        </div>
        <div className="flex items-center gap-1.5 hover:bg-neutral-100 p-2 rounded-md cursor-pointer flex-1 justify-center">
          <Repeat2 size={18} />
          <span className="text-sm font-semibold">Repost</span>
        </div>
        <div className="flex items-center gap-1.5 hover:bg-neutral-100 p-2 rounded-md cursor-pointer flex-1 justify-center">
          <Send size={18} />
          <span className="text-sm font-semibold">Send</span>
        </div>
      </div>
    </div>
  );

  const renderInstagram = () => (
    <div className="bg-white text-black rounded-lg border border-neutral-200 shadow-sm max-w-[400px] w-full font-sans overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <img src={authorImage} alt="Avatar" className="w-8 h-8 rounded-full border border-neutral-200 p-0.5" />
          <span className="font-semibold text-sm hover:text-neutral-500 cursor-pointer">{authorHandle.replace("@", "")}</span>
        </div>
        <MoreHorizontal size={20} className="text-neutral-800" />
      </div>

      <div className="bg-neutral-100 w-full aspect-square flex items-center justify-center relative">
        {post.postImage ? (
          <img src={post.postImage} alt="Post media" className="w-full h-full object-cover" />
        ) : (
          <div className="text-neutral-400 text-sm flex flex-col items-center">
            <Instagram size={32} className="mb-2 opacity-50" />
            No Image Provided
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Heart size={24} className="hover:text-neutral-500 cursor-pointer" />
            <MessageCircle size={24} className="hover:text-neutral-500 cursor-pointer" />
            <Send size={24} className="hover:text-neutral-500 cursor-pointer" />
          </div>
          <Bookmark size={24} className="hover:text-neutral-500 cursor-pointer" />
        </div>
        
        <div className="font-semibold text-sm mb-1">0 likes</div>
        
        <div className="text-sm whitespace-pre-wrap">
          <span className="font-semibold mr-2">{authorHandle.replace("@", "")}</span>
          {post.content}
        </div>
      </div>
    </div>
  );

  const renderFacebook = () => (
    <div className="bg-white text-black p-3 rounded-lg border border-neutral-200 shadow-sm max-w-[400px] w-full font-sans">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          <img src={authorImage} alt="Avatar" className="w-10 h-10 rounded-full" />
          <div className="flex flex-col justify-center">
            <span className="font-bold text-[15px] hover:underline cursor-pointer">{authorName}</span>
            <span className="text-neutral-500 text-xs flex items-center gap-1">Just now · 🌎</span>
          </div>
        </div>
        <MoreHorizontal size={20} className="text-neutral-500" />
      </div>

      <div className="text-[15px] whitespace-pre-wrap mb-3">
        {post.content}
      </div>

      {post.postImage && (
        <div className="mt-2 -mx-3 bg-neutral-100">
          <img src={post.postImage} alt="Post media" className="w-full h-auto object-cover" />
        </div>
      )}

      <div className="flex items-center justify-between mt-1 pt-1 border-t border-neutral-200 text-neutral-500">
        <div className="flex items-center gap-2 hover:bg-neutral-100 p-2 rounded-md cursor-pointer flex-1 justify-center">
          <Heart size={20} className="text-neutral-500" />
          <span className="font-semibold text-[15px]">Like</span>
        </div>
        <div className="flex items-center gap-2 hover:bg-neutral-100 p-2 rounded-md cursor-pointer flex-1 justify-center">
          <MessageCircle size={20} className="text-neutral-500" />
          <span className="font-semibold text-[15px]">Comment</span>
        </div>
        <div className="flex items-center gap-2 hover:bg-neutral-100 p-2 rounded-md cursor-pointer flex-1 justify-center">
          <Share size={20} className="text-neutral-500" />
          <span className="font-semibold text-[15px]">Share</span>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => {
    switch (post.platform) {
      case "twitter": return renderTwitter();
      case "linkedin": return renderLinkedIn();
      case "instagram": return renderInstagram();
      case "facebook": return renderFacebook();
      default: return renderTwitter();
    }
  };

  const getPlatformIcon = () => {
    switch (post.platform) {
      case "twitter": return <Twitter size={16} />;
      case "linkedin": return <Linkedin size={16} />;
      case "instagram": return <Instagram size={16} />;
      case "facebook": return <Facebook size={16} />;
      default: return <MessageCircle size={16} />;
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-[400px] flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-neutral-400 font-medium text-sm capitalize">
          {getPlatformIcon()}
          {post.platform} Preview
        </div>
        <Button 
          onClick={handlePost} 
          disabled={isPosting}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
          size="sm"
        >
          {isPosting ? "Posting..." : "Post Now"}
        </Button>
      </div>
      
      <div className="w-full flex justify-center">
        {renderPreview()}
      </div>
    </div>
  );
}

// Simple chart icon for twitter
function BarChartIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
