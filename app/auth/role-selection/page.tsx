// リダイレクト処理を一旦「ログインチェック」だけに絞る
  useEffect(() => {
    if (loading) return;

    // 未ログイン時はログインページへリダイレクト（これは残してOK）
    if (!user) {
      router.push('/');
      return;
    }

    /* --- 一旦コメントアウトしてループを阻止 ---
    if (user.role && user.role !== 'unknown') {
      router.push('/');
      return;
    }
    --------------------------------------- */
  }, [user, loading, router]);