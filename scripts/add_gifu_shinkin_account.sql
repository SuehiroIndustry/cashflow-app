-- =============================================================
-- Supabase Dashboard > SQL Editor で実行してください
-- 現在残高のシングルソース・オブ・トゥルースは cash_accounts.current_balance
-- =============================================================

-- Step 1: 岐阜信用金庫口座を追加
INSERT INTO cash_accounts (name, current_balance, org_id)
VALUES ('岐阜信用金庫', 4600780, 1);

-- Step 2: 楽天メイン口座の current_balance を通帳残高に更新
UPDATE cash_accounts
SET current_balance = 5515808
WHERE id = 2;

-- Step 3: 実行後の確認
-- 期待値:
--   id=2  メイン口座（楽天）  5,515,808
--   id=X  岐阜信用金庫        4,600,780
--   合計                      10,116,588
SELECT id, name, current_balance, org_id FROM cash_accounts ORDER BY id;
