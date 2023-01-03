import { useEffect, useState } from "react";
import { Button, Input, MenuItem, Select, Stack } from "@mui/material";
import { useHotkeys } from "react-hotkeys-hook";
import { Keyboard, Piano, Videocam } from "@mui/icons-material";
import { useStore } from "@/store/useStore";
import RestEditor from "./RestEditor";

const Shortkey = ({
  trigger = () => {},
  edit = false,
  value = "ctrl+alt+y",
  onChange = () => {},
}: {
  trigger?: () => void;
  edit?: boolean;
  value: string;
  onChange?: (value: string) => void;
}) => {
  const [shortcut, setShortcut] = useState(value);
  //   const [message, setMessage] = useState("Hacked by Blade");
  const [ctrl, setCtrl] = useState(false);
  const [alt, setAlt] = useState(false);
  const [shift, setShift] = useState(false);
  const [win, setWin] = useState(false);
  const [key, setKey] = useState("");
  const isMac = navigator.userAgent.includes("Mac");

  useHotkeys(shortcut, () => trigger());

  //   useEffect(() => {
  //     if (value && onChange) {
  //       onChange("ctrl+alt+y");
  //     } else {
  //       setShortcut("ctrl+alt+y");
  //     }
  //   }, []);

  useEffect(() => {
    if (shortcut !== value) {
      onChange(shortcut);
    }
  }, [shortcut, onChange, value]);

  return edit ? (
    <>
      <div style={{ position: "relative", flexGrow: 1, marginTop: "20px", marginRight: "10px" }}>
        <Input
          value={""}
          style={{ width: '100%', height: 46 }}
          onKeyDown={(e) => {
            e.preventDefault();
            if (e.ctrlKey) {
              setCtrl(true);
            }
            if (e.altKey) {
              setAlt(true);
            }
            if (e.shiftKey) {
              setShift(true);
            }
            if (e.metaKey) {
              setWin(true);
            }
            if (
              e.code.includes("Key") &&
              e.code.replace("Key", "") &&
              e.code.replace("Key", "") !== ""
            ) {
              setKey(e.code.replace("Key", ""));
            }
            setShortcut(
              [
                e.ctrlKey ? "ctrl" : null,
                e.altKey ? "alt" : null,
                e.shiftKey ? "shift" : null,
                e.metaKey ? (isMac ? "cmd" : "win") : null,
                e.code.includes("Key") && e.code.replace("Key", ""),
              ]
                .filter((n) => n)
                .join("+")
            );
          }}
          onKeyUp={(e) => {
            if (e.ctrlKey === false) {
              setCtrl(false);
            }
            if (e.altKey === false) {
              setAlt(false);
            }
            if (e.shiftKey === false) {
              setShift(false);
            }
            if (e.metaKey === false) {
              setWin(false);
              setKey("");
            }
            if (e.code.includes("Key")) {
              setKey("");
            }
          }}
        />

        <Stack
          direction={"row"}
          gap={2}
          style={{ position: "absolute", left: 0, top: -7 }}
        >
          {shortcut.split("+").map((s: any, i: number) => (
            <Button
              style={{ pointerEvents: "none" }}
              key={i}
              variant={
                (s === "ctrl" && ctrl) ||
                (s === "alt" && alt) ||
                (s === "shift" && shift) ||
                (s === "cmd" && win) ||
                (s === "win" && win) ||
                key
                  ? "contained"
                  : "outlined"
              }
            >
              {s}
            </Button>
          ))}
        </Stack>
      </div>
    </>
  ) : (
    <Stack direction={"row"} gap={2}>
      {shortcut.split("+").map((s: any, i: number) => (
        <Button
          key={i}
          variant={
            (s === "ctrl" && ctrl) ||
            (s === "alt" && alt) ||
            (s === "shift" && shift) ||
            (s === "cmd" && win) ||
            (s === "win" && win) ||
            key
              ? "contained"
              : "outlined"
          }
        >
          {s}
        </Button>
      ))}
    </Stack>
  );
};

export default Shortkey;
