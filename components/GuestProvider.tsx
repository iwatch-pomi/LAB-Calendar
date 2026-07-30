"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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
  /** 初回アクセス時のみ「これはデモデータです」を知らせるモーダルが開いているか */
  demoNoticeOpen: boolean;
  closeDemoNotice: () => void;
  /** ログイン・新規登録モーダル（専用ページへは遷移しない） */
  authOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
}

const GuestContext = createContext<GuestContextValue>({
  isGuest: false,
  requireLogin: () => {},
  notifyGuestEdit: () => {},
  promptOpen: false,
  closePrompt: () => {},
  demoNoticeOpen: false,
  closeDemoNotice: () => {},
  authOpen: false,
  openAuth: () => {},
  closeAuth: () => {},
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
  const [demoNoticeOpen, setDemoNoticeOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const openAuth = useCallback(() => {
    setPromptOpen(false);
    setDemoNoticeOpen(false);
    setAuthOpen(true);
  }, []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  useEffect(() => {
    if (!isGuest) return;

    // 保護ページ(/profile, /culture)や /login から `?login=1` で戻された場合は
    // そのままログインモーダルを開く。URL からは印を消して再表示を防ぐ。
    const params = new URLSearchParams(window.location.search);
    if (params.has("login")) {
      setAuthOpen(true);
      params.delete("login");
      const q = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${q ? `?${q}` : ""}`,
      );
      // ログインしに来た人にデモの案内は不要（次の素の訪問で出す）
      return;
    }

    // 初回アクセス（未ログイン）のみ、表示中のデータがデモであることを知らせる
    if (guestStore.hasSeenDemoNotice()) return;
    setDemoNoticeOpen(true);
  }, [isGuest]);

  const closeDemoNotice = useCallback(() => {
    guestStore.markSeenDemoNotice();
    setDemoNoticeOpen(false);
  }, []);

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
      value={{
        isGuest,
        requireLogin,
        notifyGuestEdit,
        promptOpen,
        closePrompt,
        demoNoticeOpen,
        closeDemoNotice,
        authOpen,
        openAuth,
        closeAuth,
      }}
    >
      {children}
    </GuestContext.Provider>
  );
}
