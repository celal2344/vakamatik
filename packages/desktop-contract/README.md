# Desktop bridge contract

Status: frozen for Gate 2.

This package is library-independent at the renderer boundary. The public API contains only `window.vakamatik.getAppInfo()` and `window.vakamatik.ping({ nonce })`, plus strict request/response schemas and serializable value types. Production renderer content is served from `vakamatik://app`. Main and preload may import the internal channel map from `@vakamatik/desktop-contract/ipc`; renderer code must not.

Changing this contract requires lead-agent review. It must never expose generic IPC, Electron objects, Node globals/modules, filesystem paths, filenames, URLs, dialogs, shell access, protocol access, or command execution.
