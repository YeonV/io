import { Autocomplete, Button, Card, Stack, TextField } from "@mui/material";
import produce from "immer";
import React, { FC, useEffect, useMemo, useState } from "react";
import create from "zustand";
import { v4 as uuidv4 } from "uuid";
import { devtools, persist } from "zustand/middleware";
import modules from "@/modules/modules";

export type Input = {
  name: string;
  icon: string;
};

export type InputData = Input & { data: Record<string, any> };

export type Output = {
  name: string;
  icon: string;
};

export type OutputData = Output & { data: Record<string, any> };

export type IOModule = {
  id: ModuleId;
  moduleConfig: ModuleConfig;
  InputEdit?: FC<{
    input: InputData;
    onChange: (data: Record<string, any>) => void;
  }>;
  OutputEdit?: FC<{
    output: OutputData;
    onChange: (data: Record<string, any>) => void;
  }>;
  InputDisplay?: FC<{
    input: InputData;
  }>;
  OutputDisplay?: FC<{
    output: OutputData;
  }>;
  useInputActions?: (row: Row) => void;
  useOutputActions?: (row: Row) => void;
};

type ModuleDefaultConfig = {
  enabled: boolean;
};

export type ModuleConfig<T = {}> = {
  menuLabel: string;
  inputs: Input[];
  outputs: Output[];
  config: ModuleDefaultConfig & T;
};

export type Row = {
  id: string;
  input: InputData;
  inputModule: ModuleId;
  output: OutputData;
  outputModule: ModuleId;
};

type ModuleId = keyof typeof modules;

type State = {
  modules: Record<ModuleId, IOModule>;
  rows: Record<string, Row>;
  addRow: (row: Row) => void;
};

export const useMainStore = create<State>()(
  devtools(
    persist(
      (set, get) => ({
        // MODULES
        modules: modules,
        enableModule: (moduleId: ModuleId) => {
          set(
            produce((state) => {
              state.modules[moduleId].moduleConfig.config.enabled = true;
            }),
            false,
            "enable module"
          );
        },
        disableModule: (moduleId: ModuleId) => {
          set(
            produce((state) => {
              state.modules[moduleId].moduleConfig.config.enabled = false;
            }),
            false,
            "disable module"
          );
        },
        // ROWS
        rows: {},
        addRow: (row: Row) => {
          console.log("add row", row);
          set(
            (state) => {
              console.log("state", state);
              return {
                ...state,
                rows: {
                  ...state.rows,
                  [row.id]: row,
                },
              };
            },
            false,
            "add row"
          );
        },
      }),
      {
        name: "io-v2-storage",
        partialize: (state) =>
          Object.fromEntries(
            Object.entries(state).filter(([key]) => ["rows"].includes(key))
          ),
      }
    ),
    { name: "IO APP" }
  )
);

// rows:
// const allAvailableInputs = state.modules.flatMap((mod) => {
//   return mod.inputs;
// });

export const InputSelector = ({
  onSelect,
}: {
  onSelect: (mod: ModuleId, input: Input) => void;
}) => {
  const modulesAsArray = useMainStore((state) => Object.values(state.modules));
  const modules = useMainStore((state) => state.modules);

  return (
    <Autocomplete
      id={`new-row-input-select`}
      options={modulesAsArray.flatMap((mod) => {
        return mod.moduleConfig.inputs.map((inp) => ({
          id: inp.name,
          label: inp.name,
          group: mod.moduleConfig.menuLabel,
          groupId: mod.id,
          moduleEnabled: mod.moduleConfig.config.enabled,
        }));
      })}
      isOptionEqualToValue={(opt, value) => opt.id === value.id}
      getOptionDisabled={(opt) => !opt.moduleEnabled}
      groupBy={(option) => option.group}
      getOptionLabel={(option) => option.label}
      sx={{ width: 300 }}
      renderInput={(params) => {
        return <TextField {...params} label="Select Input" />;
      }}
      onChange={(_, value) => {
        console.log(value);
        if (!value) {
          return;
        }
        const currentModule = modules[value.groupId as ModuleId];
        const input = currentModule.moduleConfig.inputs.find(
          (inp) => inp.name === value.id
        );
        if (input) {
          onSelect(currentModule.id, input);
        } else {
          throw new Error("Input not found. Cannot be possible");
        }
      }}
    />
  );
};

export const OutputSelector = ({
  onSelect,
}: {
  onSelect: (mod: ModuleId, input: Input) => void;
}) => {
  const modulesAsArray = useMainStore((state) => Object.values(state.modules));
  const modules = useMainStore((state) => state.modules);

  return (
    <Autocomplete
      id={`new-row-input-select`}
      options={modulesAsArray.flatMap((mod) => {
        return mod.moduleConfig.outputs.map((output) => ({
          id: output.name,
          label: output.name,
          group: mod.moduleConfig.menuLabel,
          groupId: mod.id,
          moduleEnabled: mod.moduleConfig.config.enabled,
        }));
      })}
      isOptionEqualToValue={(opt, value) => opt.id === value.id}
      getOptionDisabled={(opt) => !opt.moduleEnabled}
      groupBy={(option) => option.group}
      getOptionLabel={(option) => option.label}
      sx={{ width: 300 }}
      renderInput={(params) => {
        return <TextField {...params} label="Select Output" />;
      }}
      onChange={(_, value) => {
        console.log(value);
        if (!value) {
          return;
        }
        const currentModule = modules[value.groupId as ModuleId];
        const output = currentModule.moduleConfig.outputs.find(
          (output) => output.name === value.id
        );
        if (output) {
          onSelect(currentModule.id, output);
        } else {
          throw new Error("Input not found. Cannot be possible");
        }
      }}
    />
  );
};

export const NewRow = ({ onComplete }: { onComplete: () => void }) => {
  const addRow = useMainStore((state) => state.addRow);
  const [templateRow, setRow] = useState<Partial<Row> & Pick<Row, "id">>({
    id: uuidv4(),
  });
  console.log(templateRow);
  const modules = useMainStore((state) => state.modules);
  const selectedInputModule = useMemo(() => {
    if (!templateRow.input || !templateRow.inputModule) {
      return undefined;
    }
    return modules[templateRow.inputModule];
  }, [modules, templateRow]);

  const selectedOutputModule = useMemo(() => {
    if (!templateRow.output || !templateRow.outputModule) {
      return undefined;
    }
    return modules[templateRow.outputModule];
  }, [modules, templateRow]);

  const SelectedModuleInputEdit = useMemo(() => {
    return selectedInputModule?.InputEdit;
  }, [selectedInputModule]);

  const SelectedModuleOutputEdit = useMemo(() => {
    return selectedOutputModule?.OutputEdit;
  }, [selectedOutputModule]);

  return (
    <Stack
      direction={"row"}
      style={{ borderTop: "1px solid #bbb", width: "100%" }}
    >
      <InputSelector
        onSelect={(modId, inp) => {
          setRow((row) => {
            return {
              ...row,
              input: {
                ...inp,
                data: {},
              },
              inputModule: modId,
            };
          });
        }}
      ></InputSelector>
      {templateRow.input && SelectedModuleInputEdit ? (
        <SelectedModuleInputEdit
          input={templateRow.input}
          onChange={(data: Record<string, any>) => {
            setRow(
              produce((row) => {
                if (row.input) {
                  Object.assign(row.input?.data, data);
                }
              })
            );
          }}
        ></SelectedModuleInputEdit>
      ) : (
        <></>
      )}
      {templateRow.input && SelectedModuleInputEdit ? (
        <>
          <OutputSelector
            onSelect={(modId, output) => {
              setRow((row) => {
                return {
                  ...row,
                  output: {
                    ...output,
                    data: {},
                  },
                  outputModule: modId,
                };
              });
            }}
          ></OutputSelector>
          {templateRow.output && SelectedModuleOutputEdit && (
            <SelectedModuleOutputEdit
              output={templateRow.output}
              onChange={(data: Record<string, any>) => {
                setRow(
                  produce((row) => {
                    if (row.output) {
                      Object.assign(row.output?.data, data);
                    }
                  })
                );
              }}
            ></SelectedModuleOutputEdit>
          )}
        </>
      ) : (
        <></>
      )}
      <Card style={{ flexBasis: "50%", display: "flex", alignItems: "center" }}>
        <Button
          variant="outlined"
          size="small"
          sx={{ mr: 2 }}
          disabled={
            !templateRow.input ||
            !templateRow.inputModule ||
            !templateRow.output ||
            !templateRow.outputModule
          }
          onClick={() => {
            if (
              templateRow.input &&
              templateRow.inputModule &&
              templateRow.output &&
              templateRow.outputModule
            ) {
              addRow({
                id: templateRow.id,
                input: templateRow.input,
                inputModule: templateRow.inputModule,
                output: templateRow.output,
                outputModule: templateRow.outputModule,
              });
              onComplete();
            }
          }}
        >
          save
        </Button>
      </Card>
    </Stack>
  );
};
