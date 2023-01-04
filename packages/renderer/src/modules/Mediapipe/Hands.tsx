import Shortkey from "@/modules/Keyboard/Shortkey";
import type { ModuleConfig, InputData, Row } from "@/store/mainStore";
import { camelToSnake } from "@/utils";
import { Button, Icon } from "@mui/material";
import { FC, useEffect } from "react";
import {
  detectGesture,
  Gesture,
} from "../../modules/Mediapipe/Old/core/gesture-detector";
import { HandsEstimator } from "./Old/core/hands-estimator";
import create from "zustand";

type HandsConfigExample = {};

export const id = "hands-module";

export const moduleConfig: ModuleConfig<HandsConfigExample> = {
  menuLabel: "A.I.",
  inputs: [
    {
      name: "Hands",
      icon: "sign_language",
    },
  ],
  outputs: [],
  config: {
    enabled: true,
  },
};

type GestureState = {
  gesture: Gesture;
  setGesture: (gesture: Gesture) => void;
};

const useGestureStore = create<GestureState>()((set, get) => {
  const estimator = new HandsEstimator();
  let lastGesture: Gesture = Gesture.Unknown;
  let i = 0;
  estimator.addListener((results) => {
    const landmarks = results?.multiHandLandmarks[0];

    if (landmarks) {
      const gesture = detectGesture(landmarks);
      if (gesture === lastGesture) {
        i++;
        if (i === 10) {
          get().setGesture(gesture);
        }
      } else {
        lastGesture = gesture;
        i = 0;
      }
    }
  });
  estimator.start();
  return {
    gesture: Gesture.Unknown,
    setGesture: (gesture: Gesture) => {
      set((state) => ({
        ...state,
        gesture,
      }));
    },
  };
});

export const InputEdit: FC<{
  input: InputData;
  onChange: (data: Record<string, any>) => void;
}> = ({ input, onChange }) => {
  const gesture = useGestureStore((state) => state.gesture);
  useEffect(() => {
    if (Gesture[gesture] !== input.data?.value) {
      onChange({
        value: Gesture[gesture],
      });
    }
  }, [gesture]);

  return (
    <div style={{ textAlign: "left", marginTop: "10px" }}>
      <Button variant="outlined">{input.data?.value || ""}</Button>
    </div>
  );
};

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  console.log("HERE", input);
  return (
    <>
      {" "}
      <Icon>{camelToSnake(input.icon)}</Icon>
      <Shortkey
        value={input.data.value}
        trigger={() => {
          console.log("SHORTKEY;");
        }}
      />
    </>
  );
};

export const useInputActions = (row: Row) => {
  const gesture = useGestureStore((state) => state.gesture);

  useEffect(() => {
    if (Gesture[gesture] === row.input.data.value) {
      window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }));
    }
  }, [gesture]);
};
