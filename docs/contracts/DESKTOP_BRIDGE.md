# Gate 2 desktop bridge contract

Status: frozen on 2026-08-29 before delegated implementation.

The renderer receives exactly one global, `window.vakamatik`, with two named asynchronous operations:

| Operation         | Request                                                        | Response                      | Purpose                                    |
| ----------------- | -------------------------------------------------------------- | ----------------------------- | ------------------------------------------ |
| `getAppInfo()`    | Strict empty object internally                                 | `{ name, version, platform }` | Display non-sensitive shell identity.      |
| `ping({ nonce })` | 1–64 ASCII letters, digits, `_`, or `-`; unknown keys rejected | `{ nonce, status: "ok" }`     | Prove the typed bridge and IPC round trip. |

Runtime rules:

- Zod validates requests and responses in preload and main.
- Production renderer origin is exactly `vakamatik://app`. Development may use only loopback HTTP origins such as `http://127.0.0.1:<port>` or `http://localhost:<port>`.
- Every main-process handler validates `event.sender`, `event.senderFrame`, the exact main frame, and the expected application origin.
- The preload exposes functions through `contextBridge`; it never exposes `ipcRenderer`, `send`, `invoke`, or event objects.
- The renderer imports only public types. IPC channel constants are isolated in the package's `./ipc` subpath for main/preload.
- The renderer global must contain only `vakamatik`, and that object must contain only `getAppInfo` and `ping`.
- Returned values are plain structured-clone-compatible objects.

The contract intentionally has no filesystem, path, filename, URL, shell, dialog, protocol, command, case, patient, image, measurement, preview, or exporter operation. Those require later-gate contracts and are not implied by this shell proof.

The security shape follows Electron's official recommendations for [context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) and [IPC sender validation](https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages).
