"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  /** 使い方のチュートリアルが開いているか（初回アクセス時と「使い方」ボタン） */
  tutorialOpen: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
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
  tutorialOpen: false,
  openTutorial: () => {},
  closeTutorial: () => {},
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
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const openAuth = useCallback(() => {
    setPromptOpen(false);
    setTutorialOpen(false);
    setAuthOpen(true);
  }, []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  // サーバーが描画した認証状態(isGuest)とブラウザが持つセッションのズレを直す。
  // OAuth から戻った直後（特に既にGoogleにログイン済みで即座に戻ってくる場合）、
  // サーバー描画が「未ログイン」のままになることがあり、手動でリロードするまで
  // ゲスト表示が残ってしまう。ズレを検知したら router.refresh() で描画し直す。
  const router = useRouter();
  const syncedFor = useRef<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const reconcile = (hasSession: boolean) => {
      if (cancelled) return;
      // hasSession と isGuest が同じ値 = サーバー描画とブラウザの認識がズレている
      if (hasSession !== isGuest) return;
      // 同じ状態に対して繰り返し refresh しない（ループ防止）
      if (syncedFor.current === isGuest) return;
      syncedFor.current = isGuest;
      router.refresh();
    };

    // URLのハッシュにトークンが載って戻るケースもここで拾える
    supabase.auth.getSession().then(({ data }) => reconcile(!!data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      reconcile(!!session),
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [isGuest, router]);

  // ログインが反映されたら、ゲスト向けのモーダルは閉じる。
  // チュートリアルはログイン後も出すものなので、ここでは閉じない
  // （閲覧の途中でログインが通っても読み続けられるように）。
  useEffect(() => {
    if (isGuest) return;
    setAuthOpen(false);
    setPromptOpen(false);
  }, [isGuest]);

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
      // ログインしに来た人に使い方の案内は不要（次の素の訪問で出す）
      return;
    }

    // 初回アクセス（未ログイン）のみ、使い方のチュートリアルを出す。
    // ログイン後の自動表示は、先に出るオーバーレイの都合を見て CalendarApp が決める。
    if (guestStore.hasSeenTutorial()) return;
    setTutorialOpen(true);
  }, [isGuest]);

  // 既読の保存先はゲスト(localStorage)とログイン後(user_settings)で違うため、
  // ここでは開閉だけを持ち、保存は CalendarApp 側で行う。
  const openTutorial = useCallback(() => setTutorialOpen(true), []);
  const closeTutorial = useCallback(() => setTutorialOpen(false), []);

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
        tutorialOpen,
        openTutorial,
        closeTutorial,
        authOpen,
        openAuth,
        closeAuth,
      }}
    >
      {children}
    </GuestContext.Provider>
  );
}
