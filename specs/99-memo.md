# 開発メモ（縦スライス実装と接続検証の履歴）

**概況**
- 目的: ACP 対応 VS Code 拡張の縦スライスを最短で成立させ、Claude Code（CLI）と接続検証する。
- 結果: モック（tools/mock-agent.js）とブリッジ（tools/claude-acp-agent.js）で initialize → newSession → prompt の往復を確認。Claude CLI は ACP を直接話さないため、ブリッジ経由で運用。

**主な実装**
- 拡張スキャフォールド一式
  - `package.json`（`main: ./out/src/extension.js`、`engines:^1.88.0`、`contributes.configuration`、`capabilities.untrustedWorkspaces`、コマンド群）
  - `tsconfig.json`（`target: ES2023`、`lib: [ES2023, DOM]`、`rootDir: .`）
  - `.vscode/launch.json` / `.vscode/tasks.json` / `.gitignore` / `README.md`
- コマンド
  - `acp.connect` / `acp.prompt` / `acp.cancel`
  - 設定・運用: `acp.setAgentPath` / `acp.setAgentArgs` / `acp.showConfig` / `acp.disconnect` / `acp.reconnect`
- 接続とプロセス管理
  - `child_process.spawn(stdio: ['pipe','pipe','pipe'])`、`Readable.toWeb` / `Writable.toWeb`
  - OutputChannel に段階ログ（`[connect] / [spawn] / [agent] spawned / [rpc] ...`）
  - 子プロセス stderr/stdout を `[agent/stderr]` / `[agent/stdout]` で配線可視化
  - `initialize` / `newSession` に 10 秒タイムアウト
  - `deactivate`/`dispose` で確実に kill、`disconnect`/`reconnect` 追加
- FS/Permission（Client 実装）
  - `readTextFile` / `writeTextFile`（UTF-8）
  - 絶対パスのみ許可＋ワークスペース外ブロック
  - `requestPermission` は QuickPick（`PermissionItem{ optionId }`）で最低限
- ACP ライブラリの扱い
  - 公式 `@zed-industries/agent-client-protocol` を利用（拡張は ESM）
  - tsup（esbuild, target: node20）で TS ソースを直接バンドル（`noExternal` 指定）
  - 実行時 import は `@zed-industries/agent-client-protocol/typescript/acp.ts`

**ブリッジ/モック**
- `tools/mock-agent.js`
  - ACP を最小実装。初期は `id===0` を弾くバグがあり修正（`if (id === undefined || id === null)`）。
  - 送受信を stderr に出力してラインプロトコルを確認。
- `tools/claude-acp-agent.js`
  - ACP リクエストを受け、内部で `claude -p --output-format json <prompt>` を実行。
  - 結果を 1 回の `agent_message_chunk` として中継し、`stopReason: end_turn` を返す。
  - `--claude-path=` と任意の `--model=` を引数で指定可。

**設定と運用の要点**
- 設定 UI が見えない場合は Extension Development Host 側で確認（F5 の別ウィンドウ）。
- `acp.agentPath`/`acp.agentArgs` はコマンドから更新（ファイル選択＋JSON 配列入力が安全）。
- `ACP: Show Config` で現在値をダンプ。
- Workspace Trust が必須（未信頼だと接続を抑止）。
- CWD は開いているワークスペースのルートに追従（未指定時は `/`）。

**デバッグの経緯（要点）**
- 最初の initialize タイムアウト: エージェント側が ACP/stdio を話していないため。
- モック導入で配線確認 → `id=0` ハンドリング修正で往復成立。
- Claude CLI は ACP を直接話さない → ブリッジ（claude-acp-agent.js）を挟んで stdio JSON-RPC を実現。
- 典型的な誤設定: agentPath を Claude 本体に、ブリッジを引数に渡してしまう（誤）→ agentPath にブリッジ、args に `--claude-path=...` を渡す（正）。

**既知の落とし穴**
- `agentArgs` を空白区切りで書くとパスが壊れることがある → JSON 配列で入力。
- `main` のパス（バンドル後は `out/extension.js`）を manifest に合わせる。
- pnpm の store 不整合 → `pnpm install` or `pnpm config set store-dir ...` で解消。
- TypeScript: `ChildProcessWithoutNullStreams` 型ズレ → `ChildProcess` に変更し安全にアクセス。

**コミット履歴（要約）**
- feat(acp-vscode): VS Code 拡張の縦スライス実装
  - スキャフォールド、接続、コマンド、vendor、モック/ブリッジ。
- chore(prettier): Prettier 導入と全体整形（機能変更なし）。

**次のリファクタリング方針（提案）**
- 構成分離
  - `processManager.ts`（spawn/kill/streams/ログ）
  - `acpClient.ts`（ClientSideConnection ラップ、initialize/newSession/prompt/cancel）
  - `vscodeUi.ts`（Output/QuickPick/エラーダイアログ）
  - `configService.ts`（設定の取得/更新/検証）
- ログポリシー統一（レベル別、JSON/テキスト切替）
- `session/update` の整形表示（メッセージ/ツール/プラン）
- ブリッジの強化
  - `--output-format stream-json` によるストリーミング中継
  - モデル/設定のマッピングとエラーハンドリングの拡充
- vendor の扱い
  - 上流の TS パッケージが dist を同梱したら置換、あるいはサブモジュール化
- テスト
  - モックエージェントを用いた E2E（initialize→newSession→prompt）
  - VS Code 拡張のユニット化が難しい箇所は分離して関数単位で検証

**手順（再確認）**
- ブリッジ経由で Claude と接続
  - `ACP: Set Agent Path` → `tools/claude-acp-agent.js`
  - `ACP: Set Agent Args` → `["--claude-path=/Users/.../claude","--model=sonnet"]`（任意）
  - `ACP: Reconnect Agent` → `ACP: Send Prompt`
- モックで配線確認
  - `ACP: Set Agent Path` → `tools/mock-agent.js`
  - `ACP: Reconnect Agent` → `ACP: Send Prompt`

---
このメモは、次フェーズのリファクタリング（責務分離・ストリーミング対応・ロギング整備等）に向けた参照用にまとめたものです。
