"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptCapabilitiesSchema =
  exports.mcpCapabilitiesSchema =
  exports.authMethodSchema =
  exports.contentBlockSchema =
  exports.mcpServerSchema =
  exports.stdioSchema =
  exports.fileSystemCapabilitySchema =
  exports.terminalExitStatusSchema =
  exports.envVariableSchema =
  exports.toolCallLocationSchema =
  exports.toolCallContentSchema =
  exports.permissionOptionSchema =
  exports.unstructuredCommandInputSchema =
  exports.extNotification1Schema =
  exports.sessionModeIdSchema =
  exports.extMethodResponse1Schema =
  exports.promptResponseSchema =
  exports.setSessionModeResponseSchema =
  exports.authenticateResponseSchema =
  exports.embeddedResourceResourceSchema =
  exports.annotationsSchema =
  exports.httpHeaderSchema =
  exports.extMethodRequest1Schema =
  exports.setSessionModeRequestSchema =
  exports.authenticateRequestSchema =
  exports.extNotificationSchema =
  exports.cancelNotificationSchema =
  exports.extMethodResponseSchema =
  exports.killTerminalResponseSchema =
  exports.waitForTerminalExitResponseSchema =
  exports.releaseTerminalResponseSchema =
  exports.createTerminalResponseSchema =
  exports.requestPermissionResponseSchema =
  exports.readTextFileResponseSchema =
  exports.writeTextFileResponseSchema =
  exports.toolCallStatusSchema =
  exports.toolKindSchema =
  exports.blobResourceContentsSchema =
  exports.textResourceContentsSchema =
  exports.roleSchema =
  exports.extMethodRequestSchema =
  exports.killTerminalCommandRequestSchema =
  exports.waitForTerminalExitRequestSchema =
  exports.releaseTerminalRequestSchema =
  exports.terminalOutputRequestSchema =
  exports.readTextFileRequestSchema =
  exports.writeTextFileRequestSchema =
  exports.PROTOCOL_VERSION =
  exports.CLIENT_METHODS =
  exports.AGENT_METHODS =
    void 0;
exports.agentClientProtocolSchema =
  exports.agentNotificationSchema =
  exports.agentResponseSchema =
  exports.agentRequestSchema =
  exports.clientRequestSchema =
  exports.sessionNotificationSchema =
  exports.initializeResponseSchema =
  exports.initializeRequestSchema =
  exports.requestPermissionRequestSchema =
  exports.clientResponseSchema =
  exports.availableCommandSchema =
  exports.agentCapabilitiesSchema =
  exports.clientCapabilitiesSchema =
  exports.toolCallUpdateSchema =
  exports.loadSessionResponseSchema =
  exports.newSessionResponseSchema =
  exports.promptRequestSchema =
  exports.loadSessionRequestSchema =
  exports.newSessionRequestSchema =
  exports.terminalOutputResponseSchema =
  exports.createTerminalRequestSchema =
  exports.clientNotificationSchema =
  exports.availableCommandInputSchema =
  exports.planEntrySchema =
  exports.sessionModeStateSchema =
  exports.sessionModeSchema =
    void 0;
exports.AGENT_METHODS = {
  authenticate: "authenticate",
  initialize: "initialize",
  session_cancel: "session/cancel",
  session_load: "session/load",
  session_new: "session/new",
  session_prompt: "session/prompt",
  session_set_mode: "session/set_mode",
};
exports.CLIENT_METHODS = {
  fs_read_text_file: "fs/read_text_file",
  fs_write_text_file: "fs/write_text_file",
  session_request_permission: "session/request_permission",
  session_update: "session/update",
  terminal_create: "terminal/create",
  terminal_kill: "terminal/kill",
  terminal_output: "terminal/output",
  terminal_release: "terminal/release",
  terminal_wait_for_exit: "terminal/wait_for_exit",
};
exports.PROTOCOL_VERSION = 1;
const zod_1 = require("zod");
/** @internal */
exports.writeTextFileRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  content: zod_1.z.string(),
  path: zod_1.z.string(),
  sessionId: zod_1.z.string(),
});
/** @internal */
exports.readTextFileRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  limit: zod_1.z.number().optional().nullable(),
  line: zod_1.z.number().optional().nullable(),
  path: zod_1.z.string(),
  sessionId: zod_1.z.string(),
});
/** @internal */
exports.terminalOutputRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  sessionId: zod_1.z.string(),
  terminalId: zod_1.z.string(),
});
/** @internal */
exports.releaseTerminalRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  sessionId: zod_1.z.string(),
  terminalId: zod_1.z.string(),
});
/** @internal */
exports.waitForTerminalExitRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  sessionId: zod_1.z.string(),
  terminalId: zod_1.z.string(),
});
/** @internal */
exports.killTerminalCommandRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  sessionId: zod_1.z.string(),
  terminalId: zod_1.z.string(),
});
/** @internal */
exports.extMethodRequestSchema = zod_1.z.record(zod_1.z.unknown());
/** @internal */
exports.roleSchema = zod_1.z.union([
  zod_1.z.literal("assistant"),
  zod_1.z.literal("user"),
]);
/** @internal */
exports.textResourceContentsSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  mimeType: zod_1.z.string().optional().nullable(),
  text: zod_1.z.string(),
  uri: zod_1.z.string(),
});
/** @internal */
exports.blobResourceContentsSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  blob: zod_1.z.string(),
  mimeType: zod_1.z.string().optional().nullable(),
  uri: zod_1.z.string(),
});
/** @internal */
exports.toolKindSchema = zod_1.z.union([
  zod_1.z.literal("read"),
  zod_1.z.literal("edit"),
  zod_1.z.literal("delete"),
  zod_1.z.literal("move"),
  zod_1.z.literal("search"),
  zod_1.z.literal("execute"),
  zod_1.z.literal("think"),
  zod_1.z.literal("fetch"),
  zod_1.z.literal("switch_mode"),
  zod_1.z.literal("other"),
]);
/** @internal */
exports.toolCallStatusSchema = zod_1.z.union([
  zod_1.z.literal("pending"),
  zod_1.z.literal("in_progress"),
  zod_1.z.literal("completed"),
  zod_1.z.literal("failed"),
]);
/** @internal */
exports.writeTextFileResponseSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
});
/** @internal */
exports.readTextFileResponseSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  content: zod_1.z.string(),
});
/** @internal */
exports.requestPermissionResponseSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  outcome: zod_1.z.union([
    zod_1.z.object({
      outcome: zod_1.z.literal("cancelled"),
    }),
    zod_1.z.object({
      optionId: zod_1.z.string(),
      outcome: zod_1.z.literal("selected"),
    }),
  ]),
});
/** @internal */
exports.createTerminalResponseSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  terminalId: zod_1.z.string(),
});
/** @internal */
exports.releaseTerminalResponseSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
});
/** @internal */
exports.waitForTerminalExitResponseSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  exitCode: zod_1.z.number().optional().nullable(),
  signal: zod_1.z.string().optional().nullable(),
});
/** @internal */
exports.killTerminalResponseSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
});
/** @internal */
exports.extMethodResponseSchema = zod_1.z.record(zod_1.z.unknown());
/** @internal */
exports.cancelNotificationSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  sessionId: zod_1.z.string(),
});
/** @internal */
exports.extNotificationSchema = zod_1.z.record(zod_1.z.unknown());
/** @internal */
exports.authenticateRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  methodId: zod_1.z.string(),
});
/** @internal */
exports.setSessionModeRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  modeId: zod_1.z.string(),
  sessionId: zod_1.z.string(),
});
/** @internal */
exports.extMethodRequest1Schema = zod_1.z.record(zod_1.z.unknown());
/** @internal */
exports.httpHeaderSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  name: zod_1.z.string(),
  value: zod_1.z.string(),
});
/** @internal */
exports.annotationsSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  audience: zod_1.z.array(exports.roleSchema).optional().nullable(),
  lastModified: zod_1.z.string().optional().nullable(),
  priority: zod_1.z.number().optional().nullable(),
});
/** @internal */
exports.embeddedResourceResourceSchema = zod_1.z.union([
  exports.textResourceContentsSchema,
  exports.blobResourceContentsSchema,
]);
/** @internal */
exports.authenticateResponseSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
});
/** @internal */
exports.setSessionModeResponseSchema = zod_1.z.object({
  meta: zod_1.z.unknown().optional(),
});
/** @internal */
exports.promptResponseSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  stopReason: zod_1.z.union([
    zod_1.z.literal("end_turn"),
    zod_1.z.literal("max_tokens"),
    zod_1.z.literal("max_turn_requests"),
    zod_1.z.literal("refusal"),
    zod_1.z.literal("cancelled"),
  ]),
});
/** @internal */
exports.extMethodResponse1Schema = zod_1.z.record(zod_1.z.unknown());
/** @internal */
exports.sessionModeIdSchema = zod_1.z.string();
/** @internal */
exports.extNotification1Schema = zod_1.z.record(zod_1.z.unknown());
/** @internal */
exports.unstructuredCommandInputSchema = zod_1.z.object({
  hint: zod_1.z.string(),
});
/** @internal */
exports.permissionOptionSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  kind: zod_1.z.union([
    zod_1.z.literal("allow_once"),
    zod_1.z.literal("allow_always"),
    zod_1.z.literal("reject_once"),
    zod_1.z.literal("reject_always"),
  ]),
  name: zod_1.z.string(),
  optionId: zod_1.z.string(),
});
/** @internal */
exports.toolCallContentSchema = zod_1.z.union([
  zod_1.z.object({
    content: zod_1.z.union([
      zod_1.z.object({
        _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
        annotations: exports.annotationsSchema.optional().nullable(),
        text: zod_1.z.string(),
        type: zod_1.z.literal("text"),
      }),
      zod_1.z.object({
        _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
        annotations: exports.annotationsSchema.optional().nullable(),
        data: zod_1.z.string(),
        mimeType: zod_1.z.string(),
        type: zod_1.z.literal("image"),
        uri: zod_1.z.string().optional().nullable(),
      }),
      zod_1.z.object({
        _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
        annotations: exports.annotationsSchema.optional().nullable(),
        data: zod_1.z.string(),
        mimeType: zod_1.z.string(),
        type: zod_1.z.literal("audio"),
      }),
      zod_1.z.object({
        _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
        annotations: exports.annotationsSchema.optional().nullable(),
        description: zod_1.z.string().optional().nullable(),
        mimeType: zod_1.z.string().optional().nullable(),
        name: zod_1.z.string(),
        size: zod_1.z.number().optional().nullable(),
        title: zod_1.z.string().optional().nullable(),
        type: zod_1.z.literal("resource_link"),
        uri: zod_1.z.string(),
      }),
      zod_1.z.object({
        _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
        annotations: exports.annotationsSchema.optional().nullable(),
        resource: exports.embeddedResourceResourceSchema,
        type: zod_1.z.literal("resource"),
      }),
    ]),
    type: zod_1.z.literal("content"),
  }),
  zod_1.z.object({
    _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
    newText: zod_1.z.string(),
    oldText: zod_1.z.string().optional().nullable(),
    path: zod_1.z.string(),
    type: zod_1.z.literal("diff"),
  }),
  zod_1.z.object({
    terminalId: zod_1.z.string(),
    type: zod_1.z.literal("terminal"),
  }),
]);
/** @internal */
exports.toolCallLocationSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  line: zod_1.z.number().optional().nullable(),
  path: zod_1.z.string(),
});
/** @internal */
exports.envVariableSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  name: zod_1.z.string(),
  value: zod_1.z.string(),
});
/** @internal */
exports.terminalExitStatusSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  exitCode: zod_1.z.number().optional().nullable(),
  signal: zod_1.z.string().optional().nullable(),
});
/** @internal */
exports.fileSystemCapabilitySchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  readTextFile: zod_1.z.boolean().optional(),
  writeTextFile: zod_1.z.boolean().optional(),
});
/** @internal */
exports.stdioSchema = zod_1.z.object({
  args: zod_1.z.array(zod_1.z.string()),
  command: zod_1.z.string(),
  env: zod_1.z.array(exports.envVariableSchema),
  name: zod_1.z.string(),
});
/** @internal */
exports.mcpServerSchema = zod_1.z.union([
  zod_1.z.object({
    headers: zod_1.z.array(exports.httpHeaderSchema),
    name: zod_1.z.string(),
    type: zod_1.z.literal("http"),
    url: zod_1.z.string(),
  }),
  zod_1.z.object({
    headers: zod_1.z.array(exports.httpHeaderSchema),
    name: zod_1.z.string(),
    type: zod_1.z.literal("sse"),
    url: zod_1.z.string(),
  }),
  exports.stdioSchema,
]);
/** @internal */
exports.contentBlockSchema = zod_1.z.union([
  zod_1.z.object({
    _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
    annotations: exports.annotationsSchema.optional().nullable(),
    text: zod_1.z.string(),
    type: zod_1.z.literal("text"),
  }),
  zod_1.z.object({
    _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
    annotations: exports.annotationsSchema.optional().nullable(),
    data: zod_1.z.string(),
    mimeType: zod_1.z.string(),
    type: zod_1.z.literal("image"),
    uri: zod_1.z.string().optional().nullable(),
  }),
  zod_1.z.object({
    _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
    annotations: exports.annotationsSchema.optional().nullable(),
    data: zod_1.z.string(),
    mimeType: zod_1.z.string(),
    type: zod_1.z.literal("audio"),
  }),
  zod_1.z.object({
    _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
    annotations: exports.annotationsSchema.optional().nullable(),
    description: zod_1.z.string().optional().nullable(),
    mimeType: zod_1.z.string().optional().nullable(),
    name: zod_1.z.string(),
    size: zod_1.z.number().optional().nullable(),
    title: zod_1.z.string().optional().nullable(),
    type: zod_1.z.literal("resource_link"),
    uri: zod_1.z.string(),
  }),
  zod_1.z.object({
    _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
    annotations: exports.annotationsSchema.optional().nullable(),
    resource: exports.embeddedResourceResourceSchema,
    type: zod_1.z.literal("resource"),
  }),
]);
/** @internal */
exports.authMethodSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  description: zod_1.z.string().optional().nullable(),
  id: zod_1.z.string(),
  name: zod_1.z.string(),
});
/** @internal */
exports.mcpCapabilitiesSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  http: zod_1.z.boolean().optional(),
  sse: zod_1.z.boolean().optional(),
});
/** @internal */
exports.promptCapabilitiesSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  audio: zod_1.z.boolean().optional(),
  embeddedContext: zod_1.z.boolean().optional(),
  image: zod_1.z.boolean().optional(),
});
/** @internal */
exports.sessionModeSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  description: zod_1.z.string().optional().nullable(),
  id: exports.sessionModeIdSchema,
  name: zod_1.z.string(),
});
/** @internal */
exports.sessionModeStateSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  availableModes: zod_1.z.array(exports.sessionModeSchema),
  currentModeId: zod_1.z.string(),
});
/** @internal */
exports.planEntrySchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  content: zod_1.z.string(),
  priority: zod_1.z.union([
    zod_1.z.literal("high"),
    zod_1.z.literal("medium"),
    zod_1.z.literal("low"),
  ]),
  status: zod_1.z.union([
    zod_1.z.literal("pending"),
    zod_1.z.literal("in_progress"),
    zod_1.z.literal("completed"),
  ]),
});
/** @internal */
exports.availableCommandInputSchema = exports.unstructuredCommandInputSchema;
/** @internal */
exports.clientNotificationSchema = zod_1.z.union([
  exports.cancelNotificationSchema,
  exports.extNotificationSchema,
]);
/** @internal */
exports.createTerminalRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  args: zod_1.z.array(zod_1.z.string()).optional(),
  command: zod_1.z.string(),
  cwd: zod_1.z.string().optional().nullable(),
  env: zod_1.z.array(exports.envVariableSchema).optional(),
  outputByteLimit: zod_1.z.number().optional().nullable(),
  sessionId: zod_1.z.string(),
});
/** @internal */
exports.terminalOutputResponseSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  exitStatus: exports.terminalExitStatusSchema.optional().nullable(),
  output: zod_1.z.string(),
  truncated: zod_1.z.boolean(),
});
/** @internal */
exports.newSessionRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  cwd: zod_1.z.string(),
  mcpServers: zod_1.z.array(exports.mcpServerSchema),
});
/** @internal */
exports.loadSessionRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  cwd: zod_1.z.string(),
  mcpServers: zod_1.z.array(exports.mcpServerSchema),
  sessionId: zod_1.z.string(),
});
/** @internal */
exports.promptRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  prompt: zod_1.z.array(exports.contentBlockSchema),
  sessionId: zod_1.z.string(),
});
/** @internal */
exports.newSessionResponseSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  modes: exports.sessionModeStateSchema.optional().nullable(),
  sessionId: zod_1.z.string(),
});
/** @internal */
exports.loadSessionResponseSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  modes: exports.sessionModeStateSchema.optional().nullable(),
});
/** @internal */
exports.toolCallUpdateSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  content: zod_1.z.array(exports.toolCallContentSchema).optional().nullable(),
  kind: exports.toolKindSchema.optional().nullable(),
  locations: zod_1.z
    .array(exports.toolCallLocationSchema)
    .optional()
    .nullable(),
  rawInput: zod_1.z.record(zod_1.z.unknown()).optional(),
  rawOutput: zod_1.z.record(zod_1.z.unknown()).optional(),
  status: exports.toolCallStatusSchema.optional().nullable(),
  title: zod_1.z.string().optional().nullable(),
  toolCallId: zod_1.z.string(),
});
/** @internal */
exports.clientCapabilitiesSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  fs: exports.fileSystemCapabilitySchema.optional(),
  terminal: zod_1.z.boolean().optional(),
});
/** @internal */
exports.agentCapabilitiesSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  loadSession: zod_1.z.boolean().optional(),
  mcpCapabilities: exports.mcpCapabilitiesSchema.optional(),
  promptCapabilities: exports.promptCapabilitiesSchema.optional(),
});
/** @internal */
exports.availableCommandSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  description: zod_1.z.string(),
  input: exports.availableCommandInputSchema.optional().nullable(),
  name: zod_1.z.string(),
});
/** @internal */
exports.clientResponseSchema = zod_1.z.union([
  exports.writeTextFileResponseSchema,
  exports.readTextFileResponseSchema,
  exports.requestPermissionResponseSchema,
  exports.createTerminalResponseSchema,
  exports.terminalOutputResponseSchema,
  exports.releaseTerminalResponseSchema,
  exports.waitForTerminalExitResponseSchema,
  exports.killTerminalResponseSchema,
  exports.extMethodResponseSchema,
]);
/** @internal */
exports.requestPermissionRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  options: zod_1.z.array(exports.permissionOptionSchema),
  sessionId: zod_1.z.string(),
  toolCall: exports.toolCallUpdateSchema,
});
/** @internal */
exports.initializeRequestSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  clientCapabilities: exports.clientCapabilitiesSchema.optional(),
  protocolVersion: zod_1.z.number(),
});
/** @internal */
exports.initializeResponseSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  agentCapabilities: exports.agentCapabilitiesSchema.optional(),
  authMethods: zod_1.z.array(exports.authMethodSchema).optional(),
  protocolVersion: zod_1.z.number(),
});
/** @internal */
exports.sessionNotificationSchema = zod_1.z.object({
  _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
  sessionId: zod_1.z.string(),
  update: zod_1.z.union([
    zod_1.z.object({
      content: exports.contentBlockSchema,
      sessionUpdate: zod_1.z.literal("user_message_chunk"),
    }),
    zod_1.z.object({
      content: exports.contentBlockSchema,
      sessionUpdate: zod_1.z.literal("agent_message_chunk"),
    }),
    zod_1.z.object({
      content: exports.contentBlockSchema,
      sessionUpdate: zod_1.z.literal("agent_thought_chunk"),
    }),
    zod_1.z.object({
      _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
      content: zod_1.z.array(exports.toolCallContentSchema).optional(),
      kind: zod_1.z
        .union([
          zod_1.z.literal("read"),
          zod_1.z.literal("edit"),
          zod_1.z.literal("delete"),
          zod_1.z.literal("move"),
          zod_1.z.literal("search"),
          zod_1.z.literal("execute"),
          zod_1.z.literal("think"),
          zod_1.z.literal("fetch"),
          zod_1.z.literal("switch_mode"),
          zod_1.z.literal("other"),
        ])
        .optional(),
      locations: zod_1.z.array(exports.toolCallLocationSchema).optional(),
      rawInput: zod_1.z.record(zod_1.z.unknown()).optional(),
      rawOutput: zod_1.z.record(zod_1.z.unknown()).optional(),
      sessionUpdate: zod_1.z.literal("tool_call"),
      status: zod_1.z
        .union([
          zod_1.z.literal("pending"),
          zod_1.z.literal("in_progress"),
          zod_1.z.literal("completed"),
          zod_1.z.literal("failed"),
        ])
        .optional(),
      title: zod_1.z.string(),
      toolCallId: zod_1.z.string(),
    }),
    zod_1.z.object({
      _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
      content: zod_1.z
        .array(exports.toolCallContentSchema)
        .optional()
        .nullable(),
      kind: exports.toolKindSchema.optional().nullable(),
      locations: zod_1.z
        .array(exports.toolCallLocationSchema)
        .optional()
        .nullable(),
      rawInput: zod_1.z.record(zod_1.z.unknown()).optional(),
      rawOutput: zod_1.z.record(zod_1.z.unknown()).optional(),
      sessionUpdate: zod_1.z.literal("tool_call_update"),
      status: exports.toolCallStatusSchema.optional().nullable(),
      title: zod_1.z.string().optional().nullable(),
      toolCallId: zod_1.z.string(),
    }),
    zod_1.z.object({
      _meta: zod_1.z.record(zod_1.z.unknown()).optional(),
      entries: zod_1.z.array(exports.planEntrySchema),
      sessionUpdate: zod_1.z.literal("plan"),
    }),
    zod_1.z.object({
      availableCommands: zod_1.z.array(exports.availableCommandSchema),
      sessionUpdate: zod_1.z.literal("available_commands_update"),
    }),
    zod_1.z.object({
      currentModeId: exports.sessionModeIdSchema,
      sessionUpdate: zod_1.z.literal("current_mode_update"),
    }),
  ]),
});
/** @internal */
exports.clientRequestSchema = zod_1.z.union([
  exports.writeTextFileRequestSchema,
  exports.readTextFileRequestSchema,
  exports.requestPermissionRequestSchema,
  exports.createTerminalRequestSchema,
  exports.terminalOutputRequestSchema,
  exports.releaseTerminalRequestSchema,
  exports.waitForTerminalExitRequestSchema,
  exports.killTerminalCommandRequestSchema,
  exports.extMethodRequestSchema,
]);
/** @internal */
exports.agentRequestSchema = zod_1.z.union([
  exports.initializeRequestSchema,
  exports.authenticateRequestSchema,
  exports.newSessionRequestSchema,
  exports.loadSessionRequestSchema,
  exports.setSessionModeRequestSchema,
  exports.promptRequestSchema,
  exports.extMethodRequest1Schema,
]);
/** @internal */
exports.agentResponseSchema = zod_1.z.union([
  exports.initializeResponseSchema,
  exports.authenticateResponseSchema,
  exports.newSessionResponseSchema,
  exports.loadSessionResponseSchema,
  exports.setSessionModeResponseSchema,
  exports.promptResponseSchema,
  exports.extMethodResponse1Schema,
]);
/** @internal */
exports.agentNotificationSchema = zod_1.z.union([
  exports.sessionNotificationSchema,
  exports.extNotification1Schema,
]);
/** @internal */
exports.agentClientProtocolSchema = zod_1.z.union([
  exports.clientRequestSchema,
  exports.clientResponseSchema,
  exports.clientNotificationSchema,
  exports.agentRequestSchema,
  exports.agentResponseSchema,
  exports.agentNotificationSchema,
]);
//# sourceMappingURL=schema.js.map
