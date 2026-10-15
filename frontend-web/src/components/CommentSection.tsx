"use client";

import React, { useState } from "react";
import { Comment, Position } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { MessageSquare, ShieldCheck, AlertCircle, Send } from "lucide-react";

interface CommentSectionProps {
  comments: Comment[];
  userPosition?: Position | null;
  onPostComment?: (content: string) => Promise<void>;
}

export function CommentSection({
  comments,
  userPosition,
  onPostComment,
}: CommentSectionProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Eligible to comment if holding at least 50 KP worth of shares
  const canComment = Boolean(
    userPosition && userPosition.total_invested_kp >= 50
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !onPostComment) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onPostComment(content.trim());
      setContent("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Yorum gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg text-zinc-100">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-base text-zinc-100">Kulis Yorumları</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-semibold">
            {comments.length}
          </span>
        </div>

        <div className="text-[11px] text-zinc-400 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Rozetli Hisse Sahipleri</span>
        </div>
      </div>

      {/* Comment Input Box */}
      <div className="mt-4">
        {canComment && userPosition ? (
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
              <span>Yorum Rozetiniz:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  userPosition.side === "YES"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {userPosition.side === "YES" ? "🟢 EVET" : "🔴 HAYIR"} • {userPosition.shares.toFixed(1)} Hisse
              </span>
            </div>

            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Bu soru hakkındaki kulis bilginizi veya tahmin gerekçenizi paylaşın..."
                className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition resize-none"
              />
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="absolute right-3 bottom-3 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition disabled:opacity-40"
              >
                <Send className="w-3 h-3" />
                <span>Gönder</span>
              </button>
            </div>
            {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}
          </form>
        ) : (
          <div className="p-3 bg-zinc-800/50 border border-zinc-800 rounded-xl text-xs text-zinc-400 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Yorum yazabilmek için bu soruda en az <strong>50 KP</strong> değerinde hisseye sahip olmanız gerekir.
            </span>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="mt-5 space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs">
            Henüz yorum yapılmamış. İlk kulis yorumunu hisse sahipleri yapabilir!
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-3.5 bg-zinc-800/40 border border-zinc-800/60 rounded-xl space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-zinc-200">
                    {comment.username}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      comment.user_side === "YES"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {comment.user_side === "YES" ? "🟢 EVET" : "🔴 HAYIR"} • {comment.user_shares_snapshot} Hisse
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500">
                  {formatDate(comment.created_at)}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
