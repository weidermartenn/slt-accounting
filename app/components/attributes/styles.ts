import type { IStyleData } from "@univerjs/core";

export const STYLES: Record<string, IStyleData> = {
  hdr: {
    bg: { rgb: "#5CCCCC" },
    bd: {
      l: { s: 1, cl: { rgb: "#000000" } },
      t: { s: 1, cl: { rgb: "#000000" } },
      b: { s: 1, cl: { rgb: "#000000" } },
      r: { s: 1, cl: { rgb: "#000000" } },
    },
    tb: 3,
    ht: 1,
    vt: 2,
    fs: 12,
    pd: {
      l: 4,
    },
  },
  allrows: {
    tb: 2,
    vt: 2,
    pd: {
      l: 4,
    },
    bd: {
      l: { s: 1, cl: { rgb: "#000000" } },
      t: { s: 1, cl: { rgb: "#000000" } },
      b: { s: 1, cl: { rgb: "#000000" } },
      r: { s: 1, cl: { rgb: "#000000" } },
    }
  },
  idcol: {
    cl: { rgb: "#FFFFFF" },
  },
  lockedCol: {
    bg: { rgb: "#DDDDDD" },
    vt: 2,
    pd: {
      l: 4,
    },
    bd: {
      l: { s: 1, cl: { rgb: "#000000" } },
      t: { s: 1, cl: { rgb: "#000000" } },
      b: { s: 1, cl: { rgb: "#000000" } },
      r: { s: 1, cl: { rgb: "#000000" } },
    }
  },
  conditionallyFilled: {
    bg: { rgb: "#FFFF00" }, // Желтый цвет для условно заполненных ячеек
    vt: 2,
    pd: {
      l: 4,
    },
    bd: {
      l: { s: 1, cl: { rgb: "#000000" } },
      t: { s: 1, cl: { rgb: "#000000" } },
      b: { s: 1, cl: { rgb: "#000000" } },
      r: { s: 1, cl: { rgb: "#000000" } },
    }
  },
  lockedRow: {
    bg: { rgb: "#DDDDDD" }, // Цвет для заблокированных строк
    vt: 2,
    pd: {
      l: 4,
    },
    bd: {
      l: { s: 1, cl: { rgb: "#cccccc" } },
      t: { s: 1, cl: { rgb: "#cccccc" } },
      b: { s: 1, cl: { rgb: "#cccccc" } },
      r: { s: 1, cl: { rgb: "#cccccc" } },
    }
  }
};