"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestError =
  exports.ClientSideConnection =
  exports.TerminalHandle =
  exports.AgentSideConnection =
    void 0;
const zod_1 = require("zod");
const schema = __importStar(require("./schema"));
__exportStar(require("./schema"), exports);
/**
 * An agent-side connection to a client.
 *
 * This class provides the agent's view of an ACP connection, allowing
 * agents to communicate with clients. It implements the {@link Client} interface
 * to provide methods for requesting permissions, accessing the file system,
 * and sending session updates.
 *
 * See protocol docs: [Agent](https://agentclientprotocol.com/protocol/overview#agent)
 */
class AgentSideConnection {
  #connection;
  /**
   * Creates a new agent-side connection to a client.
   *
   * This establishes the communication channel from the agent's perspective
   * following the ACP specification.
   *
   * @param toAgent - A function that creates an Agent handler to process incoming client requests
   * @param input - The stream for sending data to the client (typically stdout)
   * @param output - The stream for receiving data from the client (typically stdin)
   *
   * See protocol docs: [Communication Model](https://agentclientprotocol.com/protocol/overview#communication-model)
   */
  constructor(toAgent, input, output) {
    const agent = toAgent(this);
    const requestHandler = async (method, params) => {
      switch (method) {
        case schema.AGENT_METHODS.initialize: {
          const validatedParams = schema.initializeRequestSchema.parse(params);
          return agent.initialize(validatedParams);
        }
        case schema.AGENT_METHODS.session_new: {
          const validatedParams = schema.newSessionRequestSchema.parse(params);
          return agent.newSession(validatedParams);
        }
        case schema.AGENT_METHODS.session_load: {
          if (!agent.loadSession) {
            throw RequestError.methodNotFound(method);
          }
          const validatedParams = schema.loadSessionRequestSchema.parse(params);
          return agent.loadSession(validatedParams);
        }
        case schema.AGENT_METHODS.session_set_mode: {
          if (!agent.setSessionMode) {
            throw RequestError.methodNotFound(method);
          }
          const validatedParams =
            schema.setSessionModeRequestSchema.parse(params);
          const result = await agent.setSessionMode(validatedParams);
          return result ?? {};
        }
        case schema.AGENT_METHODS.authenticate: {
          const validatedParams =
            schema.authenticateRequestSchema.parse(params);
          const result = await agent.authenticate(validatedParams);
          return result ?? {};
        }
        case schema.AGENT_METHODS.session_prompt: {
          const validatedParams = schema.promptRequestSchema.parse(params);
          return agent.prompt(validatedParams);
        }
        default:
          if (method.startsWith("_")) {
            if (!agent.extMethod) {
              throw RequestError.methodNotFound(method);
            }
            return agent.extMethod(method.substring(1), params);
          }
          throw RequestError.methodNotFound(method);
      }
    };
    const notificationHandler = async (method, params) => {
      switch (method) {
        case schema.AGENT_METHODS.session_cancel: {
          const validatedParams = schema.cancelNotificationSchema.parse(params);
          return agent.cancel(validatedParams);
        }
        default:
          if (method.startsWith("_")) {
            if (!agent.extNotification) {
              return;
            }
            return agent.extNotification(method.substring(1), params);
          }
          throw RequestError.methodNotFound(method);
      }
    };
    this.#connection = new Connection(
      requestHandler,
      notificationHandler,
      input,
      output,
    );
  }
  /**
   * Handles session update notifications from the agent.
   *
   * This is a notification endpoint (no response expected) that sends
   * real-time updates about session progress, including message chunks,
   * tool calls, and execution plans.
   *
   * Note: Clients SHOULD continue accepting tool call updates even after
   * sending a `session/cancel` notification, as the agent may send final
   * updates before responding with the cancelled stop reason.
   *
   * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output)
   */
  async sessionUpdate(params) {
    return await this.#connection.sendNotification(
      schema.CLIENT_METHODS.session_update,
      params,
    );
  }
  /**
   * Requests permission from the user for a tool call operation.
   *
   * Called by the agent when it needs user authorization before executing
   * a potentially sensitive operation. The client should present the options
   * to the user and return their decision.
   *
   * If the client cancels the prompt turn via `session/cancel`, it MUST
   * respond to this request with `RequestPermissionOutcome::Cancelled`.
   *
   * See protocol docs: [Requesting Permission](https://agentclientprotocol.com/protocol/tool-calls#requesting-permission)
   */
  async requestPermission(params) {
    return await this.#connection.sendRequest(
      schema.CLIENT_METHODS.session_request_permission,
      params,
    );
  }
  /**
   * Reads content from a text file in the client's file system.
   *
   * Only available if the client advertises the `fs.readTextFile` capability.
   * Allows the agent to access file contents within the client's environment.
   *
   * See protocol docs: [Client](https://agentclientprotocol.com/protocol/overview#client)
   */
  async readTextFile(params) {
    return await this.#connection.sendRequest(
      schema.CLIENT_METHODS.fs_read_text_file,
      params,
    );
  }
  /**
   * Writes content to a text file in the client's file system.
   *
   * Only available if the client advertises the `fs.writeTextFile` capability.
   * Allows the agent to create or modify files within the client's environment.
   *
   * See protocol docs: [Client](https://agentclientprotocol.com/protocol/overview#client)
   */
  async writeTextFile(params) {
    return (
      (await this.#connection.sendRequest(
        schema.CLIENT_METHODS.fs_write_text_file,
        params,
      )) ?? {}
    );
  }
  /**
   * Executes a command in a new terminal.
   *
   * Returns a `TerminalHandle` that can be used to get output, wait for exit,
   * kill the command, or release the terminal.
   *
   * The terminal can also be embedded in tool calls by using its ID in
   * `ToolCallContent` with type "terminal".
   *
   * @param params - The terminal creation parameters
   * @returns A handle to control and monitor the terminal
   */
  async createTerminal(params) {
    const response = await this.#connection.sendRequest(
      schema.CLIENT_METHODS.terminal_create,
      params,
    );
    return new TerminalHandle(
      response.terminalId,
      params.sessionId,
      this.#connection,
    );
  }
  /**
   * Extension method
   *
   * Allows the Agent to send an arbitrary request that is not part of the ACP spec.
   */
  async extMethod(method, params) {
    return await this.#connection.sendRequest(`_${method}`, params);
  }
  /**
   * Extension notification
   *
   * Allows the Agent to send an arbitrary notification that is not part of the ACP spec.
   */
  async extNotification(method, params) {
    return await this.#connection.sendNotification(`_${method}`, params);
  }
}
exports.AgentSideConnection = AgentSideConnection;
/**
 * Handle for controlling and monitoring a terminal created via `createTerminal`.
 *
 * Provides methods to:
 * - Get current output without waiting
 * - Wait for command completion
 * - Kill the running command
 * - Release terminal resources
 *
 * **Important:** Always call `release()` when done with the terminal to free resources.

 * The terminal supports async disposal via `Symbol.asyncDispose` for automatic cleanup.

 * You can use `await using` to ensure the terminal is automatically released when it
 * goes out of scope.
 */
class TerminalHandle {
  id;
  #sessionId;
  #connection;
  constructor(id, sessionId, conn) {
    this.id = id;
    this.#sessionId = sessionId;
    this.#connection = conn;
  }
  /**
   * Gets the current terminal output without waiting for the command to exit.
   */
  async currentOutput() {
    return await this.#connection.sendRequest(
      schema.CLIENT_METHODS.terminal_output,
      {
        sessionId: this.#sessionId,
        terminalId: this.id,
      },
    );
  }
  /**
   * Waits for the terminal command to complete and returns its exit status.
   */
  async waitForExit() {
    return await this.#connection.sendRequest(
      schema.CLIENT_METHODS.terminal_wait_for_exit,
      {
        sessionId: this.#sessionId,
        terminalId: this.id,
      },
    );
  }
  /**
   * Kills the terminal command without releasing the terminal.
   *
   * The terminal remains valid after killing, allowing you to:
   * - Get the final output with `currentOutput()`
   * - Check the exit status
   * - Release the terminal when done
   *
   * Useful for implementing timeouts or cancellation.
   */
  async kill() {
    return (
      (await this.#connection.sendRequest(schema.CLIENT_METHODS.terminal_kill, {
        sessionId: this.#sessionId,
        terminalId: this.id,
      })) ?? {}
    );
  }
  /**
   * Releases the terminal and frees all associated resources.
   *
   * If the command is still running, it will be killed.
   * After release, the terminal ID becomes invalid and cannot be used
   * with other terminal methods.
   *
   * Tool calls that already reference this terminal will continue to
   * display its output.
   *
   * **Important:** Always call this method when done with the terminal.
   */
  async release() {
    return (
      (await this.#connection.sendRequest(
        schema.CLIENT_METHODS.terminal_release,
        {
          sessionId: this.#sessionId,
          terminalId: this.id,
        },
      )) ?? {}
    );
  }
  async [Symbol.asyncDispose]() {
    await this.release();
  }
}
exports.TerminalHandle = TerminalHandle;
/**
 * A client-side connection to an agent.
 *
 * This class provides the client's view of an ACP connection, allowing
 * clients (such as code editors) to communicate with agents. It implements
 * the {@link Agent} interface to provide methods for initializing sessions, sending
 * prompts, and managing the agent lifecycle.
 *
 * See protocol docs: [Client](https://agentclientprotocol.com/protocol/overview#client)
 */
class ClientSideConnection {
  #connection;
  /**
   * Creates a new client-side connection to an agent.
   *
   * This establishes the communication channel between a client and agent
   * following the ACP specification.
   *
   * @param toClient - A function that creates a Client handler to process incoming agent requests
   * @param input - The stream for sending data to the agent (typically stdout)
   * @param output - The stream for receiving data from the agent (typically stdin)
   *
   * See protocol docs: [Communication Model](https://agentclientprotocol.com/protocol/overview#communication-model)
   */
  constructor(toClient, input, output) {
    const client = toClient(this);
    const requestHandler = async (method, params) => {
      switch (method) {
        case schema.CLIENT_METHODS.fs_write_text_file: {
          const validatedParams =
            schema.writeTextFileRequestSchema.parse(params);
          return client.writeTextFile(validatedParams);
        }
        case schema.CLIENT_METHODS.fs_read_text_file: {
          const validatedParams =
            schema.readTextFileRequestSchema.parse(params);
          return client.readTextFile(validatedParams);
        }
        case schema.CLIENT_METHODS.session_request_permission: {
          const validatedParams =
            schema.requestPermissionRequestSchema.parse(params);
          return client.requestPermission(validatedParams);
        }
        case schema.CLIENT_METHODS.terminal_create: {
          const validatedParams =
            schema.createTerminalRequestSchema.parse(params);
          return client.createTerminal?.(validatedParams);
        }
        case schema.CLIENT_METHODS.terminal_output: {
          const validatedParams =
            schema.terminalOutputRequestSchema.parse(params);
          return client.terminalOutput?.(validatedParams);
        }
        case schema.CLIENT_METHODS.terminal_release: {
          const validatedParams =
            schema.releaseTerminalRequestSchema.parse(params);
          const result = await client.releaseTerminal?.(validatedParams);
          return result ?? {};
        }
        case schema.CLIENT_METHODS.terminal_wait_for_exit: {
          const validatedParams =
            schema.waitForTerminalExitRequestSchema.parse(params);
          return client.waitForTerminalExit?.(validatedParams);
        }
        case schema.CLIENT_METHODS.terminal_kill: {
          const validatedParams =
            schema.killTerminalCommandRequestSchema.parse(params);
          const result = await client.killTerminal?.(validatedParams);
          return result ?? {};
        }
        default:
          // Handle extension methods (any method starting with '_')
          if (method.startsWith("_")) {
            const customMethod = method.substring(1);
            if (!client.extMethod) {
              throw RequestError.methodNotFound(method);
            }
            return client.extMethod(customMethod, params);
          }
          throw RequestError.methodNotFound(method);
      }
    };
    const notificationHandler = async (method, params) => {
      switch (method) {
        case schema.CLIENT_METHODS.session_update: {
          const validatedParams =
            schema.sessionNotificationSchema.parse(params);
          return client.sessionUpdate(validatedParams);
        }
        default:
          // Handle extension notifications (any method starting with '_')
          if (method.startsWith("_")) {
            const customMethod = method.substring(1);
            if (!client.extNotification) {
              return;
            }
            return client.extNotification(customMethod, params);
          }
          throw RequestError.methodNotFound(method);
      }
    };
    this.#connection = new Connection(
      requestHandler,
      notificationHandler,
      input,
      output,
    );
  }
  /**
   * Establishes the connection with a client and negotiates protocol capabilities.
   *
   * This method is called once at the beginning of the connection to:
   * - Negotiate the protocol version to use
   * - Exchange capability information between client and agent
   * - Determine available authentication methods
   *
   * The agent should respond with its supported protocol version and capabilities.
   *
   * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/initialization)
   */
  async initialize(params) {
    return await this.#connection.sendRequest(
      schema.AGENT_METHODS.initialize,
      params,
    );
  }
  /**
   * Creates a new conversation session with the agent.
   *
   * Sessions represent independent conversation contexts with their own history and state.
   *
   * The agent should:
   * - Create a new session context
   * - Connect to any specified MCP servers
   * - Return a unique session ID for future requests
   *
   * May return an `auth_required` error if the agent requires authentication.
   *
   * See protocol docs: [Session Setup](https://agentclientprotocol.com/protocol/session-setup)
   */
  async newSession(params) {
    return await this.#connection.sendRequest(
      schema.AGENT_METHODS.session_new,
      params,
    );
  }
  /**
   * Loads an existing session to resume a previous conversation.
   *
   * This method is only available if the agent advertises the `loadSession` capability.
   *
   * The agent should:
   * - Restore the session context and conversation history
   * - Connect to the specified MCP servers
   * - Stream the entire conversation history back to the client via notifications
   *
   * See protocol docs: [Loading Sessions](https://agentclientprotocol.com/protocol/session-setup#loading-sessions)
   */
  async loadSession(params) {
    return (
      (await this.#connection.sendRequest(
        schema.AGENT_METHODS.session_load,
        params,
      )) ?? {}
    );
  }
  /**
   * Sets the operational mode for a session.
   *
   * Allows switching between different agent modes (e.g., "ask", "architect", "code")
   * that affect system prompts, tool availability, and permission behaviors.
   *
   * The mode must be one of the modes advertised in `availableModes` during session
   * creation or loading. Agents may also change modes autonomously and notify the
   * client via `current_mode_update` notifications.
   *
   * This method can be called at any time during a session, whether the Agent is
   * idle or actively generating a turn.
   *
   * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
   */
  async setSessionMode(params) {
    return (
      (await this.#connection.sendRequest(
        schema.AGENT_METHODS.session_set_mode,
        params,
      )) ?? {}
    );
  }
  /**
   * Authenticates the client using the specified authentication method.
   *
   * Called when the agent requires authentication before allowing session creation.
   * The client provides the authentication method ID that was advertised during initialization.
   *
   * After successful authentication, the client can proceed to create sessions with
   * `newSession` without receiving an `auth_required` error.
   *
   * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/initialization)
   */
  async authenticate(params) {
    return (
      (await this.#connection.sendRequest(
        schema.AGENT_METHODS.authenticate,
        params,
      )) ?? {}
    );
  }
  /**
   * Processes a user prompt within a session.
   *
   * This method handles the whole lifecycle of a prompt:
   * - Receives user messages with optional context (files, images, etc.)
   * - Processes the prompt using language models
   * - Reports language model content and tool calls to the Clients
   * - Requests permission to run tools
   * - Executes any requested tool calls
   * - Returns when the turn is complete with a stop reason
   *
   * See protocol docs: [Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
   */
  async prompt(params) {
    return await this.#connection.sendRequest(
      schema.AGENT_METHODS.session_prompt,
      params,
    );
  }
  /**
   * Cancels ongoing operations for a session.
   *
   * This is a notification sent by the client to cancel an ongoing prompt turn.
   *
   * Upon receiving this notification, the Agent SHOULD:
   * - Stop all language model requests as soon as possible
   * - Abort all tool call invocations in progress
   * - Send any pending `session/update` notifications
   * - Respond to the original `session/prompt` request with `StopReason::Cancelled`
   *
   * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/prompt-turn#cancellation)
   */
  async cancel(params) {
    return await this.#connection.sendNotification(
      schema.AGENT_METHODS.session_cancel,
      params,
    );
  }
  /**
   * Extension method
   *
   * Allows the Client to send an arbitrary request that is not part of the ACP spec.
   */
  async extMethod(method, params) {
    return await this.#connection.sendRequest(`_${method}`, params);
  }
  /**
   * Extension notification
   *
   * Allows the Client to send an arbitrary notification that is not part of the ACP spec.
   */
  async extNotification(method, params) {
    return await this.#connection.sendNotification(`_${method}`, params);
  }
}
exports.ClientSideConnection = ClientSideConnection;
class Connection {
  #pendingResponses = new Map();
  #nextRequestId = 0;
  #requestHandler;
  #notificationHandler;
  #peerInput;
  #writeQueue = Promise.resolve();
  #textEncoder;
  constructor(requestHandler, notificationHandler, peerInput, peerOutput) {
    this.#requestHandler = requestHandler;
    this.#notificationHandler = notificationHandler;
    this.#peerInput = peerInput;
    this.#textEncoder = new TextEncoder();
    this.#receive(peerOutput);
  }
  async #receive(output) {
    let content = "";
    const decoder = new TextDecoder();
    const reader = output.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (!value) {
          continue;
        }
        content += decoder.decode(value, { stream: true });
        const lines = content.split("\n");
        content = lines.pop() || "";
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            let id;
            try {
              const message = JSON.parse(trimmedLine);
              id = message.id;
              this.#processMessage(message);
            } catch (err) {
              console.error(
                "Unexpected error during message processing:",
                trimmedLine,
                err,
              );
              if (id) {
                this.#sendMessage({
                  jsonrpc: "2.0",
                  id,
                  error: {
                    code: -32700,
                    message: "Parse error",
                  },
                });
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  async #processMessage(message) {
    if ("method" in message && "id" in message) {
      // It's a request
      const response = await this.#tryCallRequestHandler(
        message.method,
        message.params,
      );
      if ("error" in response) {
        console.error("Error handling request", message, response.error);
      }
      await this.#sendMessage({
        jsonrpc: "2.0",
        id: message.id,
        ...response,
      });
    } else if ("method" in message) {
      // It's a notification
      const response = await this.#tryCallNotificationHandler(
        message.method,
        message.params,
      );
      if ("error" in response) {
        console.error("Error handling notification", message, response.error);
      }
    } else if ("id" in message) {
      // It's a response
      this.#handleResponse(message);
    } else {
      console.error("Invalid message", { message });
    }
  }
  async #tryCallRequestHandler(method, params) {
    try {
      const result = await this.#requestHandler(method, params);
      return { result: result ?? null };
    } catch (error) {
      if (error instanceof RequestError) {
        return error.toResult();
      }
      if (error instanceof zod_1.z.ZodError) {
        return RequestError.invalidParams(error.format()).toResult();
      }
      let details;
      if (error instanceof Error) {
        details = error.message;
      } else if (
        typeof error === "object" &&
        error != null &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        details = error.message;
      }
      try {
        return RequestError.internalError(
          details ? JSON.parse(details) : {},
        ).toResult();
      } catch (_err) {
        return RequestError.internalError({ details }).toResult();
      }
    }
  }
  async #tryCallNotificationHandler(method, params) {
    try {
      await this.#notificationHandler(method, params);
      return { result: null };
    } catch (error) {
      if (error instanceof RequestError) {
        return error.toResult();
      }
      if (error instanceof zod_1.z.ZodError) {
        return RequestError.invalidParams(error.format()).toResult();
      }
      let details;
      if (error instanceof Error) {
        details = error.message;
      } else if (
        typeof error === "object" &&
        error != null &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        details = error.message;
      }
      try {
        return RequestError.internalError(
          details ? JSON.parse(details) : {},
        ).toResult();
      } catch (_err) {
        return RequestError.internalError({ details }).toResult();
      }
    }
  }
  #handleResponse(response) {
    const pendingResponse = this.#pendingResponses.get(response.id);
    if (pendingResponse) {
      if ("result" in response) {
        pendingResponse.resolve(response.result);
      } else if ("error" in response) {
        pendingResponse.reject(response.error);
      }
      this.#pendingResponses.delete(response.id);
    } else {
      console.error("Got response to unknown request", response.id);
    }
  }
  async sendRequest(method, params) {
    const id = this.#nextRequestId++;
    const responsePromise = new Promise((resolve, reject) => {
      this.#pendingResponses.set(id, { resolve, reject });
    });
    await this.#sendMessage({ jsonrpc: "2.0", id, method, params });
    return responsePromise;
  }
  async sendNotification(method, params) {
    await this.#sendMessage({ jsonrpc: "2.0", method, params });
  }
  async #sendMessage(json) {
    const content = JSON.stringify(json) + "\n";
    this.#writeQueue = this.#writeQueue
      .then(async () => {
        const writer = this.#peerInput.getWriter();
        try {
          await writer.write(this.#textEncoder.encode(content));
        } finally {
          writer.releaseLock();
        }
      })
      .catch((error) => {
        // Continue processing writes on error
        console.error("ACP write error:", error);
      });
    return this.#writeQueue;
  }
}
/**
 * JSON-RPC error object.
 *
 * Represents an error that occurred during method execution, following the
 * JSON-RPC 2.0 error object specification with optional additional data.
 *
 * See protocol docs: [JSON-RPC Error Object](https://www.jsonrpc.org/specification#error_object)
 */
class RequestError extends Error {
  code;
  data;
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.name = "RequestError";
    this.data = data;
  }
  /**
   * Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.
   */
  static parseError(data) {
    return new RequestError(-32700, "Parse error", data);
  }
  /**
   * The JSON sent is not a valid Request object.
   */
  static invalidRequest(data) {
    return new RequestError(-32600, "Invalid request", data);
  }
  /**
   * The method does not exist / is not available.
   */
  static methodNotFound(method) {
    return new RequestError(-32601, "Method not found", { method });
  }
  /**
   * Invalid method parameter(s).
   */
  static invalidParams(data) {
    return new RequestError(-32602, "Invalid params", data);
  }
  /**
   * Internal JSON-RPC error.
   */
  static internalError(data) {
    return new RequestError(-32603, "Internal error", data);
  }
  /**
   * Authentication required.
   */
  static authRequired(data) {
    return new RequestError(-32000, "Authentication required", data);
  }
  toResult() {
    return {
      error: {
        code: this.code,
        message: this.message,
        data: this.data,
      },
    };
  }
  toErrorResponse() {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}
exports.RequestError = RequestError;
//# sourceMappingURL=acp.js.map
