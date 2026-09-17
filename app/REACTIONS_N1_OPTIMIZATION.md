# Reactions Display Issue and N+1 Optimization Plan

## N+1問題と最適化方針

### 現状のN+1問題

#### 発生箇所

**モデル**: `app/models/reaction.rb` - `users`メソッド

```ruby
def users
  account_ids = Reaction.where(status_id: status_id, name: name, custom_emoji_id: custom_emoji_id).select(:account_id)
  Account.where(id: account_ids).limit(11)
end
```

#### 問題点

StatusReactionSerializer (app/serializers/rest/status_reaction_serializer.rb) が：

```ruby
has_many :users, serializer: REST::AccountSerializer
```

でusersをシリアライズする際、**各reactionごとにSQLクエリが発生**する。

**例**: 1つのstatusに5種類のreactionsがある場合

- 5回の `SELECT account_id FROM reactions WHERE ...`
- 5回の `SELECT * FROM accounts WHERE id IN (...)`
- 合計10回のクエリ（+ AccountSerializer内での追加クエリ）

#### 影響範囲

- Notification API (v1, v2)
- Status API (reactions含む)
- Timeline API (reactions含むstatus)

特に**Notification API**は複数のstatusを返すため、N+1が顕著。

### 最適化方針

#### Option 1: Notification.preload_cache_collection_target_statuses の拡張（推奨）

**ファイル**: `app/models/notification.rb`

**方針**:

1. `TARGET_STATUS_INCLUDES_BY_TYPE`で`reaction: [reaction: { status: :reactions }]`を指定
2. `preload_cache_collection_target_statuses`内で、reaction typeの通知について：
   - 全statusのreactionsを収集
   - 各reactionのusers (accounts)を一括プリロード
   - Reactionオブジェクトに`@users`インスタンス変数をキャッシュ

**メリット**:

- Notification APIに限定された変更
- 影響範囲が小さい
- Reactionモデルの変更不要

**実装の複雑さ**: 中程度

#### Option 2: Reaction.usersのメモ化とプリロード

**ファイル**: `app/models/reaction.rb`

```ruby
def users
  return @users if defined?(@users)

  account_ids = Reaction.where(status_id: status_id, name: name, custom_emoji_id: custom_emoji_id).select(:account_id)
  @users = Account.where(id: account_ids).limit(11).includes(:account_stat, user: :role).to_a
end
```

**メリット**:

- Reactionモデル単体で完結
- 全APIで効果がある

**デメリット**:

- メモ化だけでは不十分（複数のReactionオブジェクトが生成されるため）
- includes指定は良いが、根本的なN+1は解決しない

**実装の複雑さ**: 低

#### Option 3: Status.reactions_hash の最適化（最も効果的）

**ファイル**: `app/models/status.rb` - `reactions_hash`メソッド

**現状**:

```ruby
def reactions_hash(account = nil)
  records = reactions.group(:status_id, :name, :custom_emoji_id)
                    .order(Arel.sql('MIN(created_at) ASC'))
                    .select('..., count(*) as count, ...')

  ActiveRecord::Associations::Preloader.new(records: records, associations: :custom_emoji)
  records
end
```

**問題**: recordsは集約結果（擬似Reactionオブジェクト）で、`users`メソッドが使えない。

**方針**:

1. reactions_hashで、各reactionのaccount_idsを同時に取得
2. 全account_idsを一括でAccountsをプリロード
3. recordsに追加の属性として`users`を設定

**実装例**:

```ruby
def reactions_hash(account = nil)
  # 集約クエリ
  records = reactions.group(:status_id, :name, :custom_emoji_id)
                    .order(Arel.sql('MIN(created_at) ASC'))
                    .select('...')

  # 各reactionのaccount_idsを取得
  reaction_users = {}
  records.each do |record|
    account_ids = Reaction.where(
      status_id: record.status_id,
      name: record.name,
      custom_emoji_id: record.custom_emoji_id
    ).limit(11).pluck(:account_id)

    reaction_users[[record.name, record.custom_emoji_id]] = account_ids
  end

  # 全accountsを一括プリロード
  all_account_ids = reaction_users.values.flatten.uniq
  accounts_by_id = Account.where(id: all_account_ids)
                         .includes(:account_stat, user: :role)
                         .index_by(&:id)

  # recordsにusersを設定
  records.each do |record|
    key = [record.name, record.custom_emoji_id]
    account_ids = reaction_users[key] || []
    record.instance_variable_set(:@users, account_ids.map { |id| accounts_by_id[id] }.compact)
  end

  ActiveRecord::Associations::Preloader.new(records: records, associations: :custom_emoji).call
  records
end
```

**メリット**:

- 全APIで効果がある（最も根本的な解決）
- 1 statusあたり、reaction数に関わらず固定クエリ数

**デメリット**:

- reactions_hashの変更は影響範囲が大きい
- 実装が複雑

**実装の複雑さ**: 高

#### Option 4: StatusReactionSerializer の変更

**ファイル**: `app/serializers/rest/status_reaction_serializer.rb`

**方針**:

- serializerレベルでusersを一括プリロード
- context経由でプリロードされたaccountsを渡す

**メリット**:

- serializer層で完結

**デメリット**:

- ActiveModel::Serializerの仕組み上、contextの受け渡しが複雑
- 各呼び出し元での対応が必要

**実装の複雑さ**: 高

### 推奨アプローチ

**段階的実装**を推奨：

1. **短期**: Option 1（Notification APIのみ最適化）

   - 影響範囲が小さい
   - すぐに効果が出る
   - Notification APIが最も問題になりやすい

2. **中長期**: Option 3（reactions_hash最適化）
   - より根本的な解決
   - 十分なテストが必要
   - 段階的にロールアウト

## テスト方針

### 機能テスト

- Notification API (v1, v2)でreactionsがあるstatusを返す
- reactions[].usersに正しいaccountsが含まれる
- display_name, display_name_htmlなど全フィールドが含まれる

### パフォーマンステスト

**測定項目**:

- クエリ数（N+1の検出）
- レスポンスタイム

**テストケース**:

- reactions数: 0, 1, 5, 10
- 1 reactionあたりのusers数: 1, 5, 11
- notification数: 1, 20, 40

**ツール**:

- `rack-mini-profiler` または `bullet` gem
- `EXPLAIN ANALYZE`

### 既存機能への影響確認

- Home timeline
- Detailed status view
- Reaction追加/削除機能
- 他のserializerでのreactions参照

## 参考情報

### 関連ファイル

**モデル**:

- `app/models/reaction.rb` - Reactionモデル
- `app/models/status.rb` - Status#reactions_hash
- `app/models/notification.rb` - プリロード処理

**Serializer**:

- `app/serializers/rest/status_reaction_serializer.rb` - Reaction serializer
- `app/serializers/rest/status_serializer.rb` - Status serializer
- `app/serializers/rest/account_serializer.rb` - Account serializer

**Controller**:

- `app/controllers/api/v1/notifications_controller.rb`
- `app/controllers/api/v2/notifications_controller.rb`

**フロントエンド**:

- `app/javascript/mastodon/selectors/index.js` - makeGetStatus
- `app/javascript/mastodon/components/status_reaction_bar.jsx`

### 既知の課題

1. **reactions_hashの戻り値**:

   - 集約結果（擬似Reactionオブジェクト）のため、Reactionモデルのメソッドが使えない
   - `users`メソッドを呼ぶと動的にクエリが発生

2. **複数箇所でのreactions参照**:

   - Status API
   - Timeline API
   - Notification API
   - それぞれ異なるコードパスでreactionsを取得

3. **serializerのネスト**:
   - StatusSerializer → StatusReactionSerializer → AccountSerializer
   - 深いネストでN+1が発生しやすい

## 変更履歴

- 2026-01-12: 初版作成 - フロントエンド修正で表示問題解決、バックエンドN+1は未対応
