import { defineStore } from "pinia";
import { isTemplateSpan, isThisTypeNode } from "typescript";
import type { TransportAccounting } from "~/entities/TransportAccountingDto/types";
import type { TransportAccountingSR } from "~/entities/TransportAccountingSaveRequestDto/types";
import type {
  TransportAccountingUpdateDto,
  TransportAccountingUpdateRequest,
} from "~/entities/TransportAccountingUpdateREquest/types";

interface SocketEvent {
  type: "status_create" | "status_update" | "status_delete";
  userId: number;
  listToDel?: string | null;
  transportAccountingDTO?: TransportAccounting[];
}

export const useSheetStore = defineStore("sheet", {
  state: () => ({
    records: {} as Record<string, TransportAccounting[]>,
    loading: false,
    error: "" as string | null,
    socketHandlers: [] as Array<(event: SocketEvent) => void>,
  }),

  getters: {
    periods: (state) => Object.keys(state.records),
    entries: (state) => Object.entries(state.records),
  },

  actions: {
    async fetchAll() {
      this.loading = true;
      this.error = "";
      try {
        const headers = import.meta.server
          ? useRequestHeaders(["cookie"])
          : undefined;
        const data = await $fetch<TransportAccounting[]>(
          "/api/worktable/user-worktable-records",
          { headers }
        );
        // @ts-ignore
        const obj = data?.object ?? data?.body?.object ?? {};
        this.records = { ...obj };
      } catch (e: any) {
        this.error = e?.data?.statusMessage || e?.message || "Ошибка загрузки";
        throw e;
      } finally {
        this.loading = false;
      }
    },
    async fetchAllRoleAdmin() {
      this.loading = true;
      this.error = "";
      try {
        const headers = import.meta.server
          ? useRequestHeaders(["cookie"])
          : undefined;
        const data = await $fetch<TransportAccounting[]>(
          "/api/worktable/admin-worktable-records",
          { headers }
        );
        // @ts-ignore
        const obj = data?.object ?? data?.body?.object ?? {};
        this.records = { ...obj };
      } catch (e: any) {
        this.error = e?.data?.statusMessage || e?.message || "Ошибка загрузки";
        throw e;
      } finally {
        this.loading = false;
      }
    },
    async addMany(dtos: TransportAccountingSR[]) {
      if (!Array.isArray(dtos) || dtos.length === 0) return;
      await $fetch("/api/worktable/record-add", {
        method: "POST",
        body: dtos,
      });
    },
    async updateMany(dtos: TransportAccountingUpdateDto[]) {
      if (!Array.isArray(dtos) || dtos.length === 0) return;
      const body: TransportAccountingUpdateRequest = {
        transportAccountingSaveRequestDtos: dtos,
      };
      await $fetch("/api/worktable/record-update", {
        method: "PATCH",
        body,
      });
    },
    // async upsertOne(dto: TransportAccountingSR) {
    //     if (Number(dto?.id) > 0) {
    //         const body: TransportAccountingUpdateRequest = {
    //             transportAccountingSaveRequestDtos: [dto]
    //         }
    //         await $fetch('/api/worktable/record-update', {
    //             method: 'PATCH',
    //             body
    //         })
    //     } else {
    //         await $fetch('/api/worktable/record-add', {
    //             method: 'POST',
    //             body: [dto]
    //         })
    //     }
    // },
    async upsertOne(dto: TransportAccountingSR) {
      console.log("[store-upsertone] отправка данных", dto);

      try {
        let res;

        const isNewRecord = !dto.id || dto.id <= 0;

        if (isNewRecord) {
          const cleanDto = { ...dto };
          cleanDto.id = 0;

          res = await $fetch("/api/worktable/record-add", {
            method: "POST",
            body: [cleanDto],
          }).then((r) => console.log("[store-upsertone] ответ сервера]", r));
        } else {
          const body: TransportAccountingUpdateRequest = {
            transportAccountingSaveRequestDtos: [dto],
          };
          res = await $fetch("/api/worktable/record-update", {
            method: "PATCH",
            body,
          }).then((r) => console.log("[store-upsertone] ответ сервера]", r));
        }

        return res;
      } catch (error) {
        console.error("[ошибка]", error);
        throw error;
      }
    },
    async deleteByIds(ids: number[]) {
      if (!Array.isArray(ids) || ids.length === 0) return;
      await $fetch("/api/worktable/record-delete", {
        method: "DELETE",
        body: ids,
      });
    },
    onSocketMessage(handler: (event: SocketEvent) => void) {
      this.socketHandlers.push(handler);
      return () => {
        const index = this.socketHandlers.indexOf(handler);
        if (index > -1) this.socketHandlers.splice(index, 1);
      };
    },
    applySocketMessage(msg: SocketEvent, listName: string) {
        console.log("[applySocketMessage] сообщение", msg, "лист:", listName);

        if (!this.records[listName]) {
            this.records[listName] = [];
        }

        if (msg.type === "status_create" && msg.transportAccountingDTO?.length) {
            const dto = msg.transportAccountingDTO[0] as TransportAccounting;

            // Проверка на существование записи (чтобы не дублировать)
            const idx = this.records[listName].findIndex((r) => r.id === dto.id);
            if (idx !== -1) {
            this.records[listName][idx] = dto;
            console.log(`[socket] 🔄 обновлена запись id=${dto.id} в листе ${listName}`);
            } else {
            this.records[listName].push(dto);
            console.log(`[socket] 🟢 добавлена запись id=${dto.id} в листе ${listName}`);
            }
        }

        if (msg.type === "status_update" && msg.transportAccountingDTO?.length) {
            const dto = msg.transportAccountingDTO[0] as TransportAccounting;
            const idx = this.records[listName].findIndex((r) => r.id === dto.id);
            if (idx !== -1) {
            this.records[listName][idx] = dto;
            console.log(`[socket] 🟡 запись id=${dto.id} обновлена в листе ${listName}`);
            }
        }

        if (msg.type === "status_delete" && msg.listToDel) {
            const ids = Array.isArray(msg.listToDel) ? msg.listToDel : [msg.listToDel];
            this.records[listName] = this.records[listName].filter(
            (r) => !ids.includes(r.id)
            );
            console.log(`[socket] 🔴 удалены id=${ids.join(", ")} из листа ${listName}`);
        }
    },
    // applySocketMessage(msg: SocketEvent) {
    //   console.log("[applySocketMessage] применяем сообщение", msg);

    //   if (msg.type === "status_create" && msg.transportAccountingDTO?.length) {
    //     const dto = msg.transportAccountingDTO[0];
    //     const listName = dto.listName
    //     console.log(listName);
    //     if (!this.records[listName]) this.records[listName] = [];

    //     const tempIdx = this.records[listName].findIndex(
    //       (r) => r.id === dto.id
    //     );

    //     if (tempIdx !== -1) {
    //       this.records[listName][tempIdx] = dto;
    //     } else {
    //       this.records[listName].push(dto);
    //     }
    //   }

    //   if (msg.type === "status_update" && msg.transportAccountingDTO?.length) {
    //     const dto = msg.transportAccountingDTO[0];
    //     const listName = dto.listName || "";
    //     const idx = this.records[listName]?.findIndex((r) => r.id === dto.id);
    //     if (idx !== -1) this.records[listName][idx] = dto;
    //   }

    //   if (msg.type === "status_delete" && msg.listToDel) {
    //     const ids = Array.isArray(msg.listToDel)
    //       ? msg.listToDel
    //       : [msg.listToDel];
    //     for (const listName in this.records) {
    //       this.records[listName] = this.records[listName].filter(
    //         (r) => !ids.includes(r.id)
    //       );
    //     }
    //   }
    // },
    applyLocalChange(dto: TransportAccountingSR) {
      const listName = dto.listName || "";
      const originalId = dto.id;

      if (!this.records[listName]) {
        this.records[listName] = [];
      }

      if (originalId && originalId > 0) {
        const idx = this.records[listName].findIndex(r => r.id === originalId);

        if (idx !== -1) {
            this.records[listName][idx] = { ...dto };
            console.log(`[local] добавлена существующая запись id=${originalId}`);
        }
      }
    },
    emitSocketEvent(event: SocketEvent) {
      console.log("[socket-store] получено сообщение", event);
      this.socketHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (e) {
          console.error("[socket-store] ошибка обработки сообщения", e);
        }
      });
    },
  },
});
