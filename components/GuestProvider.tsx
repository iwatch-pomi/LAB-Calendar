"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { guestStore } from "@/lib/guestStore";

interface GuestContextValue {
  /** 未ログイン（ゲストモード）か */
  isGuest: boolean;
  /** ログイン案内モーダルを開く（保存にログインが必要な操作をしたとき） */
  requireLogin: () => void;
  /** 編集はできるが「ブラウザにだけ保存される」ことを初回のみ知らせる */
  notifyGuestEdit: () => void;
  promptOpen: boolean;
  closePrompt: () => void;
}

const GuestContext = createContext<GuestContextValue>({
  isGuest: false,
  requireLogin: () => {},
  notifyGuestEdit: () => {},
  promptOpen: false,
  closePrompt: () => {},
});

export function useGuest() {
  return useContext(GuestContext);
}

export function GuestProvider({
  isGuest,
  children,
}: {
  isGuest: boolean;
  children: React.ReactNode;
}) {
  const [promptOpen, setPromptOpen] = useState(false);

  const requireLogin = useCallback(() => {
    if (isGuest) setPromptOpen(true);
  }, [isGuest]);

  // ゲストの編集自体は許可する。初回だけ「このブラウザにのみ保存」を案内する。
  const notifyGuestEdit = useCallback(() => {
    if (!isGuest) return;
    if (guestStore.hasPromptedLogin()) return;
    guestStore.markPromptedLogin();
    setPromptOpen(true);
  }, [isGuest]);

  const closePrompt = useCallback(() => setPromptOpen(false), []);

  return (
    <GuestContext.Provider
      value={{ isGuest, requireLogin, notifyGuestEdit, promptOpen, closePrompt }}
    >
      {children}
    </GuestContext.Provider>
  );
}
