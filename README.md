# Intent Bridge

GitHub Pages で公開する前提の静的 Web アプリです。

## 目的

- 文系ユーザーが質問に答えるだけで AI 向けの JSON を作れるようにする
- `prompt` を書かせず、`意図` を構造化して渡す

## MVP

- 6問の質問フロー
- リアルタイム JSON 出力
- 必須項目の簡易検証
- GitHub Pages にそのまま配置可能

## 公開手順

1. このフォルダをリポジトリに追加
2. GitHub の `Settings > Pages` で公開ブランチを指定
3. ルート公開なら `intent-bridge/` を入口として案内する

## 次の実装

- JSON Schema バリデーション
- LLM 実行ボタン
- 質問の動的分岐
