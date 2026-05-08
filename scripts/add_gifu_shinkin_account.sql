-- =============================================================
-- 岐阜信用金庫口座を cash_accounts に追加するスクリプト
-- Supabase Dashboard の SQL Editor で実行してください
-- =============================================================

-- 実行前確認：現在の cash_accounts 状態
SELECT id, name, current_balance, org_id FROM cash_accounts;

-- =============================================================
-- Step 1: 岐阜信用金庫を cash_accounts に追加
-- org_id は楽天メイン口座（id=2）と同じ値を使用
-- =============================================================
INSERT INTO cash_accounts (name, current_balance, org_id)
SELECT
  '岐阜信用金庫' AS name,
  4600780        AS current_balance,
  org_id
FROM cash_accounts
WHERE id = 2
RETURNING id, name, current_balance, org_id;

-- =============================================================
-- Step 2: 岐阜信用金庫関連の cash_flows を新口座に紐づける
--
-- 対象の特定方法:
--   /dashboard/income の手入力一覧から、岐阜信用金庫の
--   初期残高・返済データの cash_flow ID を確認し、
--   下記 IN 句に追加してください。
--
-- 例: SELECT id, date, amount, section, memo FROM cash_flows
--     WHERE cash_account_id = 2 AND source_type = 'manual'
--     ORDER BY date;
--
-- 初期値エントリが id=134 (amount=6,102,074) であれば:
-- =============================================================

-- 対象 ID を確認するクエリ（実行して内容を確認すること）
SELECT id, date, amount, section, memo
FROM cash_flows
WHERE cash_account_id = 2
  AND source_type = 'manual'
ORDER BY date;

-- 確認後、以下の IN 句を岐阜信用金庫に関連する ID に書き換えて実行
-- UPDATE cash_flows
-- SET cash_account_id = (
--   SELECT id FROM cash_accounts WHERE name = '岐阜信用金庫'
--     AND org_id = (SELECT org_id FROM cash_accounts WHERE id = 2)
-- )
-- WHERE id IN (
--   134  -- 初期値 6,102,074
--   -- , ... 返済エントリのIDをここに追加
-- );

-- =============================================================
-- Step 3: 実行後の確認
-- =============================================================
SELECT id, name, current_balance, org_id FROM cash_accounts;
-- 期待値:
--   id=2  楽天メイン口座  5,515,808  (楽天残高に更新済みであること)
--   id=X  岐阜信用金庫    4,600,780
