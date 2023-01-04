import { Button, Stack } from "@mui/material";
import produce from "immer";
import { useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { InputSelector } from "@/components/InputSelector";
import { OutputSelector } from "@/components/OutputSelector";
import type { Row } from "@/store/mainStore";
import { useMainStore } from "@/store/mainStore";

export const IoNewRow = ({ onComplete }: { onComplete: () => void }) => {
  const addRow = useMainStore((state) => state.addRow);
  const [templateRow, setRow] = useState<Partial<Row> & Pick<Row, "id">>({
    id: uuidv4(),
  });
  // console.log(templateRow)
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
    <>
      <Stack
        direction={"row"}
        sx={{
          borderTop: "1px solid #bbb",
          width: "100%",
          justifyContent: "space-between",
          mt: 2,
          pt: 2,
          pb: 2,
        }}
      >
        <div
          style={{
            flexBasis: "50%",
            borderRight: "1px dashed #666",
            textAlign: "left",
          }}
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
          />
          {templateRow.input && SelectedModuleInputEdit ? (
            <SelectedModuleInputEdit
              input={templateRow.input}
              onChange={(data: Record<string, any>) => {
                setRow((row) => {
                  return {
                    ...row,
                    input: {
                      ...row.input,
                      data: {
                        ...(row.input?.data ?? {}),
                        ...data,
                      },
                    },
                  } as Partial<Row> & Pick<Row, "id">;
                });
              }}
            ></SelectedModuleInputEdit>
          ) : (
            <></>
          )}
        </div>
        <div
          style={{ flexBasis: "50%", marginLeft: "10px", textAlign: "left" }}
        >
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
            />
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
        </div>
      </Stack>
      <Button
        variant="contained"
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
    </>
  );
};
