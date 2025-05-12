import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { combine } from 'zustand/middleware'
import storeGeneral from './storeGeneral'

export const useStore = create(
  devtools(
    persist(
      combine(
        {
          hackedBy: 'Blade'
        },
        (set: any) => ({
          ...storeGeneral(set)
        })
      ),
      {
        name: 'io-storage',
        partialize: (state) =>
          Object.fromEntries(
            Object.entries(state).filter(([key]) => !['inputs', 'outputs', 'ui'].includes(key))
          )
      }
    )
  )
)
