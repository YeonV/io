import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { combine } from 'zustand/middleware';
import storeGeneral from './storeGeneral';
import { storeUI } from './storeUI';

export const useStore = create(
  devtools(
    persist(
      combine(
        {
          hackedBy: 'Blade',
        },
        (set: any) => ({
          ui: storeUI(set),
          ...storeGeneral(set)
        })
      )
      ,
      {
        name: 'io-storage',
        partialize: (state) =>
          Object.fromEntries(
            Object.entries(state).filter(
              ([key]) =>
                !['inputs', 'outputs', 'ui'].includes(key)
            )
          ),
      }
    )
  )
);
