# IO - InputOutput | Your Local IFTTT, SuperCharged!

<!-- Badges -->
[![Vite](https://img.shields.io/badge/Built%20with-Vite-blue.svg?logo=Vite&logoColor=white&label=)](https://vitejs.dev/)
[![Electron](https://img.shields.io/badge/Powered%20by-Electron-blue.svg?logo=Electron&logoColor=white&label=)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/UI-React-blue.svg?logo=React&logoColor=white&label=)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/Lang-TypeScript-blue.svg?logo=TypeScript&logoColor=white&label=)](https://www.typescriptlang.org/)
[![Material-UI](https://img.shields.io/badge/Styling-Material%20UI-blue.svg?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDM2IDMyIiBmaWxsPSJub25lIiBjbGFzcz0iY3NzLTExNzBuNjEiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMzAuMzQzIDIxLjk3NmExIDEgMCAwMC41MDItLjg2NGwuMDE4LTUuNzg3YTEgMSAwIDAxLjUwMi0uODY0bDMuMTM3LTEuODAyYTEgMSAwIDAxMS40OTguODY3djEwLjUyMWExIDEgMCAwMS0uNTAyLjg2N2wtMTEuODM5IDYuOGExIDEgMCAwMS0uOTk0LjAwMWwtOS4yOTEtNS4zMTRhMSAxIDAgMDEtLjUwNC0uODY4di01LjMwNWMwLS4wMDYuMDA3LS4wMS4wMTMtLjAwNy4wMDUuMDAzLjAxMiAwIC4wMTItLjAwN3YtLjAwNmMwLS4wMDQuMDAyLS4wMDguMDA2LS4wMWw3LjY1Mi00LjM5NmMuMDA3LS4wMDQuMDA0LS4wMTUtLjAwNC0uMDE1YS4wMDguMDA4IDAgMDEtLjAwOC0uMDA4bC4wMTUtNS4yMDFhMSAxIDAgMDAtMS41LS44N2wtNS42ODcgMy4yNzdhMSAxIDAgMDEtLjk5OCAwTDYuNjY2IDkuN2ExIDEgMCAwMC0xLjQ5OS44NjZ2OS40YTEgMSAwIDAxLTEuNDk2Ljg2OWwtMy4xNjYtMS44MWExIDEgMCAwMS0uNTA0LS44N2wuMDI4LTE2LjQzQTEgMSAwIDAxMS41MjcuODZsMTAuODQ1IDYuMjI5YTEgMSAwIDAwLjk5NiAwTDI0LjIxLjg2YTEgMSAwIDAxMS40OTguODY4djE2LjQzNGExIDEgMCAwMS0uNTAxLjg2N2wtNS42NzggMy4yN2ExIDEgMCAwMC4wMDQgMS43MzVsMy4xMzIgMS43ODNhMSAxIDAgMDAuOTkzLS4wMDJsNi42ODUtMy44Mzl6TTMxIDcuMjM0YTEgMSAwIDAwMS41MTQuODU3bDMtMS44QTEgMSAwIDAwMzYgNS40MzRWMS43NjZBMSAxIDAgMDAzNC40ODYuOTFsLTMgMS44YTEgMSAwIDAwLS40ODYuODU3djMuNjY4eiIgZmlsbD0iI2ZmZmZmZiI+PC9wYXRoPjwvc3ZnPg==&logoColor=white&label=)](https://mui.com/)
[![Zustand](https://img.shields.io/badge/State-Zustand-blue.svg?logo=data:image/png;base64,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&logoColor=white&label=)](https://github.com/pmndrs/zustand)

<p align="center">
  <img width="400" src="https://github.com/user-attachments/assets/99497aee-7eaa-4fcf-a409-e51be6d289e5#gh-dark-mode-only" alt="IO Application Screenshot - Dark Mode" style="max-width: 450px; border-radius: 8px; margin: 10px;" />
  <img width="400" src="https://user-images.githubusercontent.com/28861537/164577765-eb489963-cc7c-4f82-a126-7f1582574930.png#gh-light-mode-only" alt="IO Application Screenshot - Light Mode" style="max-width: 450px; border-radius: 8px; margin: 10px;" />
</p>

**IO (InputOutput) is your personal, local automation powerhouse, built to connect your digital world seamlessly.** Think of it as your own IFTTT or Zapier, running right on your machine, giving you total control and privacy. IO lets you link various **Inputs** (like keyboard shortcuts, Alexa commands, MIDI signals, or MQTT messages) to powerful **Outputs** (running shell commands, making REST API calls, controlling smart devices, or triggering text-to-speech).

Define "Rows" to connect an input trigger to an output action, and watch your custom automations come to life!

## ✨ Core Features - The IO Powerhouse

*   **Modular by Design:** Easily extend IO's capabilities by adding new Input and Output modules. The sky's the limit!
*   **Intuitive Row-Based Automation:** Simply pick an Input, pick an Output, configure them, and you've created an automation "Row."
*   **Global Keyboard Shortcuts:** Trigger any IO row with system-wide hotkeys, even when IO isn't the focused application.
*   **Alexa Voice Control:** Emulate local Alexa-compatible devices and assign actions to "On" and "Off" voice commands.
*   **Customizable Remote Deck:** Access and trigger your IO rows from a sleek web dashboard on any device on your local network.
*   **Profiles for Context:** Create different sets of active rows for different scenarios (e.g., "Work Mode," "Gaming Mode") and switch between them easily.
*   **REST Blueprints & Presets:**
    *   **Presets:** Save and reuse common REST API call configurations.
    *   **Blueprints:** Use simple forms (defined by you or bundled) to generate complex REST Presets instantly! Features an advanced **Blueprint Definition Editor** with UI/Code views and `{{ }}` placeholder autocomplete.
*   **Row Trigger History:** A detailed, filterable, and searchable log of all your row activations, presented in the new versatile `<LogViewer />`.
*   **Comprehensive Settings UI:** A new fullscreen settings dialog provides organized access to:
    *   General app behavior (startup, close action).
    *   Appearance (Light/Dark/System theme, custom primary/secondary colors).
    *   Profile management.
    *   A "Module Browser" to explore all module capabilities.
    *   "All Module Settings Panels" for direct configuration of individual modules.
    *   Data management tools.
*   **Modern & Performant:** Built with Electron, React, TypeScript, Vite, Zustand, and Material UI.
*   **Local & Private:** All your configurations and data stay on your machine.
*   **Dark/Light Mode Excellence:** Instant theme switching that respects your OS and allows user overrides, consistent across the app and the IO Deck.

## 🧩 Available Modules at a Glance

IO connects your world with a growing list of modules. Here's a snapshot:

| Input Modules                                     | Output Modules                                        |
| :------------------------------------------------ | :---------------------------------------------------- |
| [Keyboard Shortcuts](./src/renderer/src/modules/Keyboard/Keyboard.tsx) | [Play Sound](./src/renderer/src/modules/PlaySound/PlaySound.tsx)         |
| [MIDI Events](./src/renderer/src/modules/Midi/Midi.tsx)               | [Say (Text-to-Speech)](./src/renderer/src/modules/Say/Say.tsx)           |
| [Alexa Voice Commands](./src/renderer/src/modules/Alexa/Alexa.tsx)      | [Show Alert](./src/renderer/src/modules/Alert/Alert.tsx)                 |
| [Time & Schedule](./src/renderer/src/modules/Time/Time.tsx)           | [Run Shell Command](./src/renderer/src/modules/Shell/Shell.tsx)        |
| [MQTT Message Received](./src/renderer/src/modules/Mqtt/Mqtt.tsx)     | [Press Keys (Keyboard Output)](./src/renderer/src/modules/Keyboard/Keyboard.tsx) |
| [Hand Gesture (MediaPipe)](./src/renderer/src/modules/MpHands/MpHands.tsx) | [Activate Profile](./src/renderer/src/modules/ActivateProfile/ActivateProfile.tsx) |
| [Holistic Pose (MediaPipe)](./src/renderer/src/modules/MpHolistic/MpHolistic.tsx) | [REST Call (HTTP/S)](./src/renderer/src/modules/Rest/Rest.tsx) |
| [Gamepad Events](./src/renderer/src/modules/Gamepad/Gamepad.tsx)| [Publish MQTT Message](./src/renderer/src/modules/Mqtt/Mqtt.tsx)       |
|                                                   | [WLED Control](./src/renderer/src/modules/Wled/Wled.tsx)                 |
|                                                   | [LedFx Control](./src/renderer/src/modules/LedFx/LedFx.tsx)              |

*More A.I. and network modules are in development or planned! Check the "Module Browser" in Settings for the latest.*

## 🚀 Getting Started

<details>
  <summary><strong>Installation & Your First Automation (For Users)</strong></summary>

  1.  **Download:** Grab the latest release for your OS (Windows, macOS, Linux) from the [**Releases Page**](https://github.com/YeonV/io/releases).
  2.  **Install & Launch IO.**
  3.  **Create Your First Row:**
      *   Click the big "[+] Add New IO Row" button.
      *   **Input:** Select "Keyboard," then click into the shortcut field and press your desired hotkey (e.g., `Ctrl+Alt+T`).
      *   **Output:** Select "Say," then type "BeastMode Activated!" into the text field.
      *   Click "Save Row."
  4.  **Test it!** Press `Ctrl+Alt+T`. Your computer should announce your triumph!
  5.  **Explore:** Dive into other modules, create Profiles in Settings, and check out the IO Deck!

</details>

<details>
  <summary><strong>Development Setup (For Coders & Contributors)</strong></summary>

  1.  **Prerequisites:** Node.js (v20+ recommended), Yarn (Classic).
  2.  **Clone:** `git clone https://github.com/YeonV/io.git && cd io`
  3.  **Install:** `yarn install` (This will also run `electron-builder install-app-deps` to build native modules).
  4.  **Develop:** `yarn dev` (Starts Electron app with Vite HMR).
  5.  **Build & Package:** `yarn dist` (Or `build:win`, `build:mac`, `build:linux`). Refer to `package.json` for all build scripts.

</details>

## 🔧 Using Key Features

<details>
  <summary><strong>🎛️ Profiles: Contextual Automation Sets</strong></summary>
  
  Profiles let you define different sets of active rows. For example, a "Work" profile might enable specific keyboard shortcuts and API calls, while a "Gaming" profile enables different ones.
  *   Manage profiles in **Application Settings -> Profiles**.
  *   Create, edit (select which rows are included), delete, and activate profiles.
  *   Use the "Activate Profile" output module to switch profiles via an IO row itself!
</details>

<details>
  <summary><strong>🧩 REST Blueprints: Simplified API Integrations</strong></summary>

  Tired of configuring complex REST calls repeatedly? Blueprints are here!
  *   **Use Bundled Blueprints:** Find them in **Application Settings -> REST Settings -> Blueprints -> Use a Blueprint**. Select one, fill in a few simple fields (e.g., a repository name for the GitHub Blueprint), and generate a ready-to-use REST Preset.
  *   **Import Blueprints:** Drag & drop `.ioBlueprint` JSON files onto the app to import new ones.
  *   **Create Your Own:** Use the **Advanced Blueprint Editor** (accessible from REST Settings -> Blueprints) to define your own. It features a full GUI for setting up simple user inputs and templating the generated REST call (URL, headers, body, etc.), complete with `{{ }}` placeholder autocomplete!
  *   **Apply to Rows:** Once a Blueprint generates a Preset, or if you configure a row directly using a Blueprint via `RestEditor`, the row can be easily updated later using the Blueprint's simple input form.
</details>

<details>
  <summary><strong>📜 Row Trigger History: See What's Happening</strong></summary>

  IO now keeps a log of every time one of your rows is triggered.
  *   Access it via **Application Settings -> Row History**.
  *   The powerful **LogViewer** displays entries with timestamps, source, summary, and full row details (including any input payload).
  *   Filter by log level, search by text, and export the history to JSON.
</details>

## 💡 Project Status & Roadmap

IO is under active development by Blade (YeonV) with a focus on robust modularity, user experience, and powerful automation capabilities.

<details><summary><strong>Key Milestones Recently Achieved</strong></summary>

*   **Complete Architectural Refactor:** Solid foundation with Zustand, module registries, and clear separation of concerns.
*   **REST Blueprints & Advanced Editor:** Full GUI implementation.
*   **Row Trigger History & LogViewer:** Comprehensive logging and viewing.
*   **Fullscreen Settings Dialog:** Centralized and polished UI for all app configurations.
*   **Enhanced Dark/Light Mode:** Seamless, reload-free, and system-aware.
*   **Time-Based Input Module:** Advanced scheduling for your rows.
*   **Robust CI/CD:** Automated builds for all platforms, leveraging prebuilt native dependencies where possible.
*   All core modules (Keyboard, Alexa, MQTT, PlaySound, REST, Say, Shell, Time) are functional and integrated.

</details>

<details><summary><strong>Exciting Features on the Horizon!</strong></summary>

*   **MQTT Module Polish:** Even more robust MQTT integration.
*   **mDNS/Bonjour Discovery:** For easier device setup.
*   **More Input Modules:** Gamepad, Spotify, System Audio levels, Active Window focus.
*   **Advanced Workflow/Sequencing Engine:** For multi-step automations.
*   And much more! Your ideas and contributions are welcome.

</details>

## 🤝 Contributing

Passionate about local automation? Want to build the next cool module or enhance IO? Contributions are highly encouraged!

1.  Fork the repository (`YeonV/io`).
2.  Create your feature branch (`git checkout -b feature/AmazingNewThing`).
3.  Commit your changes (`git commit -m 'Add some AmazingNewThing'`).
4.  Push to the branch (`git push origin feature/AmazingNewThing`).
5.  Open a Pull Request with a clear description of your awesome work!

Let's make IO the ultimate local automation tool together!

---

[<img width="320" src="https://discordapp.com/api/guilds/964992737621475398/widget.png?style=banner2" alt="Join our Discord!" style="max-width: 320px" />](https://discord.com/invite/TGnJrrgQ)

---
[![creator](https://img.shields.io/badge/CREATOR-YeonV-blue.svg?logo=github&logoColor=white)](https://github.com/YeonV) [![creator](https://img.shields.io/badge/A.K.A-Blade-darkred.svg?logo=github&logoColor=white)](https://github.com/YeonV)