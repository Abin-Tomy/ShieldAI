import { create } from 'zustand';

const useAppStore = create((set) => ({
  // State
  scanHistory: [],
  systemStatus: null,
  intelStatus: null,
  aatrStats: null,
  maclStatus: null,

  // Actions
  addScan: (result) =>
    set((state) => ({
      scanHistory: [{ ...result, timestamp: new Date() }, ...state.scanHistory],
    })),

  setSystemStatus: (status) =>
    set({ systemStatus: status }),

  setIntelStatus: (status) =>
    set({ intelStatus: status }),

  setAatrStats: (stats) =>
    set({ aatrStats: stats }),

  setMaclStatus: (status) =>
    set({ maclStatus: status }),
}));

export default useAppStore;
