
## Core Module Interface & Exports

Every module file (e.g., `MyNewModule.tsx`) must export specific components and hooks. These exports define how your module interacts with the IO system and how users configure it. These types (`IOModule`, `ModuleConfig`, etc.) are typically imported from `@shared/types`.

Here are the essential exports:

1.  **`id: string` (Required)**
    *   A **unique string identifier** for your module. This ID is used internally to reference your module.
    *   *Convention:* `your-module-name-module` (e.g., `spotify-module`, `obs-control-module`).
    *   Example: `export const id = 'my-custom-sensor-module';`

2.  **`moduleConfig: ModuleConfig<CustomConfigType>` (Required)**
    *   Defines the static configuration and metadata for your module.
    *   `CustomConfigType` (optional): A TypeScript interface for any module-specific global configuration values.
    *   **Properties:**
        *   `menuLabel: string`: The label displayed in the "group" dropdown when a user adds a new row (e.g., "Local Triggers", "Web Services", "Smart Home").
        *   `inputs: Input[]`: An array defining the input types your module provides. Each `Input` object contains:
            *   `name: string`: The display name for this specific input trigger (e.g., "Keyboard Shortcut", "New Email Received").
            *   `icon: string`: An icon name (e.g., Material Design Icon name like `keyboard` or a custom SVG name recognized by `IoIcon`).
        *   `outputs: Output[]`: An array defining the output actions your module provides. Each `Output` object is similar to `Input`:
            *   `name: string`: The display name for this action (e.g., "Execute Shell Command", "Send Tweet").
            *   `icon: string`: An icon name.
        *   `config: { enabled: boolean } & CustomConfigType`:
            *   `enabled: boolean`: **Default enabled state** of the module when IO starts. Users can toggle this in the application settings.
            *   `...CustomConfigType` (optional): Default values for any global configuration your module needs (e.g., default API endpoints, initial settings).
    *   Example:
        ```typescript
        type WeatherModuleGlobalConfig = { defaultLocation?: string; apiKey?: string };
        export const moduleConfig: ModuleConfig<WeatherModuleGlobalConfig> = {
          menuLabel: 'Online Services',
          inputs: [{ name: 'Weather Change', icon: 'cloud' }],
          outputs: [], // This module might only provide inputs
          config: {
            enabled: true,
            defaultLocation: 'New York',
          },
        };
        ```

3.  **`InputEdit?: FC<{ input: InputData; onChange: (data: Record<string, any>) => void }>` (Optional)**
    *   A React Functional Component that renders the UI for configuring a specific **input type** from your module. This UI appears when a user adds or edits a row and selects your module's input.
    *   *Props:*
        *   `input: InputData`: The current input configuration for this row. Your UI should read from and write to `input.data`.
        *   `onChange: (data: Record<string, any>) => void`: **Crucial callback function.** Call this with an object containing the new or updated fields for `input.data` whenever the user changes a setting in your UI.
    *   _Example:_ A component allowing the user to enter a specific MQTT topic to subscribe to.

4.  **`OutputEdit?: FC<{ output: OutputData; onChange: (data: Record<string, any>) => void }>` (Optional)**
    *   Similar to `InputEdit`, but for configuring an **output action** from your module.
    *   *Props:*
        *   `output: OutputData`: The current output configuration. Your UI modifies `output.data`.
        *   `onChange`: Callback to update `output.data`.
    *   _Example:_ A component with fields for a REST API URL, method, and body.

5.  **`InputDisplay?: FC<{ input: InputData }>` (Optional)**
    *   A React Functional Component responsible for rendering a compact display of your module's **input configuration** within the main list of IO rows.
    *   *Props:* `input: InputData`.
    *   _Example:_ Displaying the configured hotkey string or the name of the Alexa device.

6.  **`OutputDisplay?: FC<{ output: OutputData }>` (Optional)**
    *   Similar to `InputDisplay`, but for rendering the **output configuration** in the row list.
    *   _Example:_ Displaying the target URL for a REST call or the first few words of a "Say" command.

7.  **`Settings?: FC<any>` (Optional)**
    *   A React Functional Component that provides a UI for **global settings** specific to your module. This UI is displayed on the main settings area of the `Home` page if your module is used in any active row.
    *   Use this for configurations that apply to the module as a whole, not individual rows (e.g., API keys, global connection parameters for a service).
    *   You will typically use `useMainStore` to access and update your module's global configuration located at `state.modules[YOUR_MODULE_ID].moduleConfig.config`.

8.  **`useInputActions?: (row: Row) => void` (Optional, for Input Modules)**
    *   A React hook that contains the **runtime logic for an input trigger**.
    *   **Important: It is called *once per row* that uses an input from this module.**
    *   *Purpose:* To set up any necessary listeners, polling mechanisms, or event subscriptions that detect when your defined input condition is met.
    *   *Action:* When the input condition occurs:
        *   Dispatch a global custom event using `window.dispatchEvent`.
        *   For simple triggers: `new CustomEvent('io_input', { detail: row.id })`
        *   If your input needs to pass data to the output (e.g., Alexa's "on" or "off" state):
          `new CustomEvent('io_input', { detail: { rowId: row.id, payload: { yourDataKey: 'yourDataValue' } } })`
    *   **Cleanup is essential:** Ensure any listeners or intervals set up in `useEffect` within this hook are properly cleaned up in the effect's return function.
    *   For interactions with the Main process (e.g., for global OS-level events or hardware access), use `ipcRenderer` and set up corresponding `ipcMain` handlers in `src/main/index.ts`.
    *   See: [`Keyboard.tsx`](./Keyboard/Keyboard.tsx) (for global shortcut pattern via Main process) or [`Alexa.tsx`](./Alexa/Alexa.tsx) (for IPC-driven events).

9.  **`useOutputActions?: (row: Row) => void` (Optional, for Output Modules)**
    *   A React hook containing the **runtime logic for an output action**.
    *   **Important: It is called *once per row* that uses an output from this module.**
    *   *Purpose:* To listen for the global `io_input` event. When an event is detected whose `detail` (or `detail.rowId`) matches this row's `id`, the hook should execute the configured output action.
    *   *Event Handling:*
        ```typescript
        useEffect(() => {
          const listener = (e: CustomEvent) => {
            const eventDetail = e.detail;
            const eventRowId = typeof eventDetail === 'object' && eventDetail !== null && eventDetail.hasOwnProperty('rowId')
                               ? eventDetail.rowId
                               : eventDetail;
            const payload = typeof eventDetail === 'object' && eventDetail !== null ? eventDetail.payload : undefined;

            if (eventRowId === row.id) {
              console.log(`Output for row ${row.id} triggered. Payload:`, payload);
              // Access row.output.data for configuration and execute action
              // Example: myAction(row.output.data.someSetting, payload?.someValue);
            }
          };
          window.addEventListener('io_input', listener);
          return () => window.removeEventListener('io_input', listener);
        }, [row.id, row.output.data]); // CRITICAL: Include all dependencies from 'row' used in the effect!
        ```
    *   Again, use `ipcRenderer` if your output action needs to interact with the Main process.
    *   See: [`Shell.tsx`](./Shell/Shell.tsx) or [`Say.tsx`](./Say/Say.tsx).

10. **`useGlobalActions?: () => void` (Optional)**
    *   A React hook that runs **once if your module is used in *any* active row**. It does *not* run per row.
    *   *Purpose:* Ideal for one-time setup for the entire module, such as:
        *   Initializing a global connection to a service.
        *   Setting up global listeners that manage events for *all* rows of this module type (e.g., the Alexa module's central IPC listener).
        *   Registering resources with the Main process.
    *   Remember to include cleanup logic in the `useEffect`'s return function.
    *   See: [`Alexa.tsx`](./Alexa/Alexa.tsx).

## Registering Your Module

After creating your module file (e.g., `MyNewModule/MyNewModule.tsx`):

1.  Open the central module registry file: `src/renderer/src/modules/modules.ts`.
2.  Import all exports from your new module file:
    ```typescript
    import * as myNewModuleFile from './MyNewModule/MyNewModule';
    ```
3.  Add your module to the `modulesObject` using its exported `id` as the key:
    ```typescript
    const modulesObject = {
      // ... other existing modules
      [myNewModuleFile.id]: myNewModuleFile,
    };
    ```
4.  **(If using static `ModuleId` in `types.ts`):**
    Open `src/shared/types.ts` and add your module's `id` string to the `ModuleId` union type to ensure type safety throughout the application:
    ```typescript
    export type ModuleId =
      | 'keyboard-module'
      // ... other module IDs
      | 'my-new-module'; // <-- Add your new module's ID here
    ```

## State Management & Best Practices

*   **Row-Specific Data:** Store configuration unique to each row instance in `input.data` or `output.data`. This data is accessible via the `row` prop in the relevant hooks and components.
*   **Module-Global Data:** For settings that apply to the entire module (e.g., API keys), use the `config` object within your `moduleConfig`. These can be made configurable via the optional `Settings` component.
*   **Zustand (`useMainStore`):** While accessible, try to minimize direct reads from the global store within module action hooks unless absolutely necessary (e.g., getting a list of all rows in `Alexa.useGlobalActions`). Prefer passing necessary data via props or relying on the `row` object. `useMainStore.getState()` can be used for non-reactive reads in callbacks/effects sparingly.
*   **IPC for Node.js/OS Access:** For any functionality requiring Node.js APIs (file system, child processes) or OS-level interaction (global shortcuts, system dialogs), use Electron's IPC mechanism (`ipcRenderer` in your module, `ipcMain` in `src/main/index.ts`).
*   **Dependencies in `useEffect`:** **Always include all props, state, or functions from the component scope that are used inside `useEffect` in its dependency array.** This is crucial for preventing stale closures and ensuring your hooks behave correctly.
*   **Logging:** Utilize the `log` utility (e.g., `import { log } from '@/utils'`) for console messages (`log.debug()`, `log.info()`, `log.error()`) to aid in development and debugging.

We're excited to see what modules you'll create! If you have questions, refer to existing modules or open an issue.

Happy Modding!