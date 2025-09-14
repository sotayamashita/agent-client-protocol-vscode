ACP VS Code 拡張 縦スライス実装タスク（対象エージェント: Claude Code / Zed）

前提（本環境）
- エージェント実行パス例: `/Users/sotayamashita/.claude/local/claude`

実装ルール
- 依存関係の追加時に package.json を直接編集しない
- 依存関係の追加は pnpm を使用（npm は使用禁止）
- 依存関係追加時はバージョンを固定しない（例: `pnpm add <pkg>`）

デバッグフロー（役割分担明確化）
- 依存インストール/ビルド
  - エージェント: コード整合性チェック、型エラー調査、`pnpm install`/`pnpm build` の実行提案と手順提示
  - あなた: ネットワークを要するコマンド（`pnpm install` 等）の実行と結果共有、必要ならプロキシ設定の提供
- 実行とログ取得
  - エージェント: `OutputChannel` 追加、JSON-RPC 送受信ログの整備（長さ制限/個人情報配慮）
- あなた: VS Code で拡張を起動（Run Extension/F5）、`ACP: Connect Agent` 実行、手順と観測結果の共有
  - あなた: （必要に応じて）`ANTHROPIC_API_KEY` を環境変数に設定して再起動
  - あなた: エージェント実行ファイルに実行権限があるか確認（例: `chmod +x /Users/sotayamashita/.claude/local/claude`）
- 検証シナリオ
  - エージェント: `initialize`→`newSession(mcpServers,cwd)`→`prompt`→`session/update`→`requestPermission`→`cancel` のチェックリスト提示
  - あなた: 実際のエージェント実行パス/引数（`acp.agentPath`/`acp.agentArgs`）を設定し、各手順を実行
- トラブルシュート
  - エージェント: 例外/リジェクトの原因切り分け、Streams 変換見直し、絶対パス/スキーマ齟齬の修正案提示
  - あなた: 失敗時のスクリーンショット/ログ提供、環境制約（権限/リモート/WSL など）の共有

- [ ] プロジェクト初期化と依存追加（`@zed-industries/agent-client-protocol`、`vscode@^1.88.0`）
- [ ] package.json 追加/更新（`main`、`engines.vscode:^1.88.0`、`activationEvents`、`contributes.commands`）
- [ ] package.json `capabilities.untrustedWorkspaces` を `limited` 設定し `restrictedConfigurations` に `acp.agentPath`/`acp.agentArgs` を追加
- [ ] 設定スキーマ追加（`contributes.configuration` に `acp.agentPath`/`acp.agentArgs`/`acp.mcpServers`）
- [ ] Claude Code 用の設定入力（`acp.agentPath` に Claude Code ACP 実行パス、必要なら `acp.agentArgs` と環境変数）
  - [ ] 本環境の例: `acp.agentPath = /Users/sotayamashita/.claude/local/claude`
- [ ] `extension.ts` 作成：`activate` 実装、`OutputChannel` 生成、ワークスペース Trust チェック

接続とプロセス管理
- [ ] `child_process.spawn` でエージェント起動（`stdio: ['pipe','pipe','inherit']`）
- [ ] `Readable.toWeb`/`Writable.toWeb` で stdin/stdout を Web Streams に変換
- [ ] 子プロセスの `exit/error` ハンドラ実装と後始末（deactivate/破棄時に確実に kill）
  - [ ] （Claude Code）必要に応じて `ANTHROPIC_API_KEY` を `env` で注入

ACP 接続と初期化
- [ ] `VSCodeClient` 実装（`Client` インターフェース）
- [ ] `ClientSideConnection` 生成し VSCodeClient を接続
- [ ] `initialize` 実行（`protocolVersion:1`、`clientCapabilities.fs.readTextFile/writeTextFile:true`）
- [ ] `newSession` 実行（`mcpServers`［camelCase］、`cwd` はワークスペースルート絶対パス）

メッセージハンドリング（縦スライス）
- [ ] `requestPermission` UI：`QuickPickItem` を拡張した `PermissionItem{ optionId }` で実装
- [ ] `sessionUpdate` でメッセージ/進捗を `OutputChannel` などに表示
- [ ] `prompt` 実行パス（入力取得→送信→リアルタイム更新反映→完了表示）
- [ ] `cancel` 実行（`session/cancel` 通知を送り、応答 stopReason:Cancelled を確認）

ファイルシステム API
- [ ] `writeTextFile` 実装（`vscode.workspace.fs.writeFile`、戻り値 `null`）
- [ ] `readTextFile` 実装（`vscode.workspace.fs.readFile`→`{ content: string }`）
- [ ] 絶対パスのみ許容（ACP 要件）。`vscode.Uri.file(absPath)` を使用し、範囲外アクセスを拒否

エラー処理と認証
- [ ] JSON-RPC エラー処理（成功は `result`、失敗は `error`）。ログ整備
- [ ] 認証要求（-32000 など）を受けた場合の `authenticate` ハンドリング（暫定実装）

ワークスペース Trust/デスクトップ前提
- [ ] `vscode.workspace.isTrusted` を参照し、未信頼時は起動/書込を抑制
- [ ] Web 版 VS Code では `child_process` 非対応である旨を UI/README に明示

検証
- [ ] `acp.connect` コマンドで接続→`initialize`/`newSession` 実行確認
- [ ] 例のプロンプト送信→`session/update` 受信と出力確認
- [ ] `requestPermission` QuickPick 選択→`selected/cancelled` の応答動作確認
- [ ] `readTextFile`/`writeTextFile` 動作確認（UTF-8）
- [ ] `cancel` 実行で stopReason:Cancelled の確認

ストレッチ（任意）
- [ ] 進行中プロンプトの UI（ステータス/キャンセルボタン）
- [ ] MCP サーバー設定 UI（`mcpServers` 編集）
- [ ] ログ/診断出力の整備（詳細レベル切替）
