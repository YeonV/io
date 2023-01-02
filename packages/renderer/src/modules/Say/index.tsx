import Shortkey from "@/components/Shortkey";
import type { ModuleConfig, OutputData, Row } from "@/mock-store";
import { useMainStore } from "@/mock-store";
import { Keyboard, RecordVoiceOver } from "@mui/icons-material";
import { Input, TextField } from "@mui/material";
import { FC, useEffect } from "react";

type SayConfigExample = {};

export const id = "say-module";

export const moduleConfig: ModuleConfig<SayConfigExample> = {
  menuLabel: "Say",
  inputs: [],
  outputs: [
    {
      name: "say",
      icon: "volume",
    },
  ],
  config: {
    enabled: true,
  },
};

export const OutputEdit: FC<{
  output: OutputData;
  onChange: (data: Record<string, any>) => void;
}> = ({ output, onChange }) => {
  //   const updateRowInputValue = useMainStore(store.updateRowInputValue);
  return (
    <>
      <RecordVoiceOver fontSize={"large"} />
      <TextField
        value={output.data.text ?? "Hello by Blade"}
        onChange={(e) => {
          onChange({ text: e.target.value });
        }}
      ></TextField>
    </>
  );
};

export const useOutputActions = (row: Row) => {
  useEffect(() => {
    const listener = (e: any) => {
      console.log("row output triggered", row, e.detail);
      if (e.detail === row.id) {
        const spk = new SpeechSynthesisUtterance();
        spk.text = row.output.data.text;
        window.speechSynthesis.speak(spk);
      }
    };
    window.addEventListener("io_input", listener);
    return () => {
      window.removeEventListener("io_input", listener);
    };
  }, [row.output.data.text]);
};
