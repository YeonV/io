# IO - InputOutput | Your Local IFTTT, SuperCharged with Vitron

<!-- Badges - Using your existing style and adding a couple for core tech -->
[![Vite](https://img.shields.io/badge/Built%20with-Vite-blue.svg?logo=Vite&logoColor=white&label=)](https://vitejs.dev/)
[![Electron](https://img.shields.io/badge/Powered%20by-Electron-blue.svg?logo=Electron&logoColor=white&label=)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/UI-React-blue.svg?logo=React&logoColor=white&label=)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/Lang-TypeScript-blue.svg?logo=TypeScript&logoColor=white&label=)](https://www.typescriptlang.org/)
[![Material-UI](https://img.shields.io/badge/Styling-Material%20UI-blue.svg?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDM2IDMyIiBmaWxsPSJub25lIiBjbGFzcz0iY3NzLTExNzBuNjEiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMzAuMzQzIDIxLjk3NmExIDEgMCAwMC41MDItLjg2NGwuMDE4LTUuNzg3YTEgMSAwIDAxLjUwMi0uODY0bDMuMTM3LTEuODAyYTEgMSAwIDAxMS40OTguODY3djEwLjUyMWExIDEgMCAwMS0uNTAyLjg2N2wtMTEuODM5IDYuOGExIDEgMCAwMS0uOTk0LjAwMWwtOS4yOTEtNS4zMTRhMSAxIDAgMDEtLjUwNC0uODY4di01LjMwNWMwLS4wMDYuMDA3LS4wMS4wMTMtLjAwNy4wMDUuMDAzLjAxMiAwIC4wMTItLjAwN3YtLjAwNmMwLS4wMDQuMDAyLS4wMDguMDA2LS4wMWw3LjY1Mi00LjM5NmMuMDA3LS4wMDQuMDA0LS4wMTUtLjAwNC0uMDE1YS4wMDguMDA4IDAgMDEtLjAwOC0uMDA4bC4wMTUtNS4yMDFhMSAxIDAgMDAtMS41LS44N2wtNS42ODcgMy4yNzdhMSAxIDAgMDEtLjk5OCAwTDYuNjY2IDkuN2ExIDEgMCAwMC0xLjQ5OS44NjZ2OS40YTEgMSAwIDAxLTEuNDk2Ljg2OWwtMy4xNjYtMS44MWExIDEgMCAwMS0uNTA0LS44N2wuMDI4LTE2LjQzQTEgMSAwIDAxMS41MjcuODZsMTAuODQ1IDYuMjI5YTEgMSAwIDAwLjk5NiAwTDI0LjIxLjg2YTEgMSAwIDAxMS40OTguODY4djE2LjQzNGExIDEgMCAwMS0uNTAxLjg2N2wtNS42NzggMy4yN2ExIDEgMCAwMC4wMDQgMS43MzVsMy4xMzIgMS43ODNhMSAxIDAgMDAuOTkzLS4wMDJsNi42ODUtMy44Mzl6TTMxIDcuMjM0YTEgMSAwIDAwMS41MTQuODU3bDMtMS44QTEgMSAwIDAwMzYgNS40MzRWMS43NjZBMSAxIDAgMDAzNC40ODYuOTFsLTMgMS44YTEgMSAwIDAwLS40ODYuODU3djMuNjY4eiIgZmlsbD0iI2ZmZmZmZiI+PC9wYXRoPjwvc3ZnPg==&logoColor=white&label=)](https://mui.com/)
[![Zustand](https://img.shields.io/badge/State-Zustand-blue.svg?logo=data:image/png;base64,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&logoColor=white&label=)](https://github.com/pmndrs/zustand)
<!-- Add more relevant badges as your project grows -->

<p align="center">
  <img width="400" src="https://user-images.githubusercontent.com/28861537/164577641-6264ac42-c9a7-4859-a307-4bdcbf00321d.png#gh-dark-mode-only" alt="IO Application Screenshot - Dark Mode" style="max-width: 450px; border-radius: 8px; margin: 10px;" />
  <img width="400" src="https://user-images.githubusercontent.com/28861537/164577765-eb489963-cc7c-4f82-a126-7f1582574930.png#gh-light-mode-only" alt="IO Application Screenshot - Light Mode" style="max-width: 450px; border-radius: 8px; margin: 10px;" />
</p>

**IO** is a powerful, modular application designed to be your local, supercharged "IFTTT" (If This Then That). It allows you to connect various **Inputs** (like keyboard shortcuts, Alexa commands, MIDI signals, or MQTT messages) to **Outputs** (such as running shell commands, sending REST API calls, controlling smart devices, or triggering text-to-speech).

Create custom "Rows" where you define an input trigger and link it to a desired output action, automating your digital life and workflows with ease!

## ✨ Core Features

*   **Modular Architecture:** IO is built with a pluggable system for Inputs and Outputs. Easily extendable with new modules for diverse integrations.
*   **Intuitive Row-Based Configuration:** Simply define a "Row" by selecting an Input and an Output, then configure their specific parameters.
*   **Global Keyboard Shortcuts:** Define system-wide hotkeys that trigger your IO rows even when the application isn't focused.
*   **Alexa Voice Control:**
    *   Emulate Alexa-compatible devices locally.
    *   Configure distinct actions for "On" and "Off" voice commands.
*   **Customizable Dashboard (Deck):**
    *   Access and trigger your configured IO rows from a responsive web dashboard.
    *   Ideal for use as a remote control from a phone or tablet on your local network.
*   **Variety of Modules (Current & Planned):**
    *   **Inputs:** Keyboard, Alexa, MIDI, MQTT, MediaPipe (Hands, Pose, etc. for gesture control - experimental).
    *   **Outputs:** Shell commands, REST API calls, Text-to-Speech (Say), MQTT, LedFx, WLED, Alerts.
*   **Modern Tech Stack:** Built with Electron, React, TypeScript, Vite, Zustand, and Material UI for a fast, reliable, and good-looking experience.
*   **Persistent Configuration:** Your rows and settings are saved locally.
*   **Dark/Light Mode:** Adapts to your system's theme.

## 🚀 Getting Started

<details>
  <summary><strong>Installation & Setup (For Users)</strong></summary>

  1.  **Download:** Grab the latest release for your operating system (Windows, macOS, Linux) from the [Releases Page](https://github.com/YeonV/io/releases).
  2.  **Install:** Follow the standard installation procedure for your OS.
  3.  **Launch IO:** Open the application.
  4.  **Create Rows:**
      *   Click the "Add New IO Row" button.
      *   Select an **Input** module (e.g., Keyboard, Alexa).
      *   Configure the input (e.g., set a hotkey, define an Alexa device name).
      *   Select an **Output** module (e.g., Shell, Say).
      *   Configure the output (e.g., enter a shell command, type text to be spoken).
      *   Save the row!
  5.  **Test:** Trigger your input (press the hotkey, issue the Alexa command) and see the output action run!
  6.  **Explore the Deck:** Access `http://<your-computer-ip>:1337/deck` from another device on your network to use the dashboard. *(Note: The IP address will be your computer's local network IP)*.

</details>

<details>
  <summary><strong>Development Setup (For Contributors)</strong></summary>

  1.  **Prerequisites:**
      *   [Node.js](https://nodejs.org/) (v18 or newer recommended)
      *   [Yarn](https://yarnpkg.com/) (Classic or Berry)
  2.  **Clone the Repository:**
      ```bash
      git clone https://github.com/YeonV/io.git
      cd io
      ```
  3.  **Install Dependencies:**
      ```bash
      yarn install
      ```
  4.  **Run in Development Mode:**
      ```bash
      yarn dev
      ```
      This will start the Electron app with Vite's HMR for the renderer process.
  5.  **Build for Production:**
      *   `yarn build`: Builds the application.
      *   `yarn build:win` / `yarn build:mac` / `yarn build:linux`: Builds and packages for specific platforms.
      *   `yarn dist`: Builds and packages for all configured platforms.

</details>

## 🔧 Key Modules & Functionality

<details>
  <summary><strong>Input Modules</strong></summary>

  *   **Keyboard:** Define global system-wide hotkeys.
      *   _Example:_ `Ctrl+Alt+P`
  *   **Alexa:** Create virtual Alexa devices triggered by voice.
      *   _Example:_ "Alexa, turn Desk Lamp on."
      *   Supports separate "On" and "Off" command actions.
  *   **MIDI:** (Work in Progress) Trigger actions from MIDI controller inputs.
  *   **MQTT:** (Refactor in Progress) Subscribe to MQTT topics and trigger actions based on messages.
  *   **MediaPipe (Experimental):**
      *   Hands, Pose, FaceMesh, Holistic, etc.
      *   Enable gesture-based input triggers (requires camera access).

</details>

<details>
  <summary><strong>Output Modules</strong></summary>

  *   **Shell:** Execute local shell commands or scripts.
      *   _Example:_ `shutdown /s /t 0` or `open /Applications/Calculator.app`
  *   **Say (Text-to-Speech):** Make your computer speak custom text.
      *   _Example:_ "Welcome home!"
  *   **REST:** Send HTTP requests (GET, POST, etc.) to APIs.
      *   _Example:_ Trigger a webhook, control smart devices via their API.
  *   **MQTT:** (Refactor in Progress) Publish messages to MQTT topics.
  *   **LedFx:** (Experimental) Control LedFx instances/effects.
  *   **WLED:** (Experimental) Control WLED devices.
  *   **Alert:** Display system notifications.

</details>

## 💡 Vision & Future Ideas

IO is designed to be a flexible automation hub. Here are some directions we're exploring or could explore in the future:

*   **Advanced Workflow Engine:**
    *   Multiple Inputs triggering the same Row/Action.
    *   A single Input triggering a chain of multiple Outputs (sequentially or in parallel).
    *   Conditional logic within workflows.
    *   (Inspired by Home Assistant's script editor UI or Node-RED for a visual approach).
*   **More Modules!** The sky's the limit:
    *   Other voice assistants (Google Assistant).
    *   Integrations with specific apps (OBS, Spotify, Discord).
    *   Hardware integrations (Elgato Stream Deck, Philips Hue directly).
    *   Webhooks as inputs.
*   **Enhanced Deck Functionality:**
    *   Real-time state feedback on Deck buttons.
    *   More customization options for Deck layout.
*   **User Accounts & Cloud Sync (Optional):** For syncing configurations across devices.
*   **Improved "Edit Row" Functionality:** Currently, rows are delete-and-recreate; full editing is a planned improvement.

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new modules, documentation improvements, or feature ideas, please feel free to:

1.  Fork the repository.
2.  Create a new branch for your feature or fix.
3.  Make your changes.
4.  Submit a PullRequest with a clear description of your work.

---

<!-- Maintain your Discord and Creator badges -->
[<img width="320" src="https://discordapp.com/api/guilds/964992737621475398/widget.png?style=banner2" alt="discord" style="max-width: 320px" />](https://discord.com/invite/TGnJrrgQ)
---
[![creator](https://img.shields.io/badge/CREATOR-Yeon-blue.svg?logo=github&logoColor=white)](https://github.com/YeonV) [![creator](https://img.shields.io/badge/A.K.A-Blade-darkred.svg?logo=github&logoColor=white)](https://github.com/YeonV)
