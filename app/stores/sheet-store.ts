import { defineStore } from "pinia";
import { isTemplateSpan, isThisTypeNode, transpileModule } from "typescript";
import type { TransportAccounting } from "~/entities/TransportAccountingDto/types";
import type { TransportAccountingSR } from "~/entities/TransportAccountingSaveRequestDto/types";
import type {
  TransportAccountingUpdateDto,
  TransportAccountingUpdateRequest,
} from "~/entities/TransportAccountingUpdateRequest/types";

interface SocketEvent {
  type: "status_create" | "status_update" | "status_delete";
  userId: number;
  listToDel?: string | null;
  transportAccountingDTO?: TransportAccounting[];
}

export const useSheetStore = defineStore("sheet", {
  state: () => ({
    records: {} as Record<string, TransportAccounting[]>,
    companies: [] as any[],
    loading: false,
    error: "" as string | null,
    socketHandlers: [] as Array<(event: SocketEvent) => void>,
    processedMessagesKeys: new Set() as Set<string>,
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
        let keyAdditonalIndex = 1;
        if (!this.processedMessagesKeys) {
          this.processedMessagesKeys = new Set();
        }
        const messageKey = `${msg.type}-${msg.userId}-${JSON.stringify(msg.listToDel)}-${keyAdditonalIndex++}` || "";

        if (this.processedMessagesKeys.has(messageKey)) {
            console.log(`[applySocketMessage] сообщение ${messageKey} уже обработано, пропускаем...`);
            return;
        }

        this.processedMessagesKeys.add(messageKey);

        console.log('[applySocketMessage] ключи обработанных сообщений', this.processedMessagesKeys);

        // через секунду удаляем
        setTimeout(() => {
          this.processedMessagesKeys.delete(messageKey);
        }, 1000)

        console.log("[applySocketMessage] сообщение", msg, "лист:", listName);
        if (!this.records[listName]) {
            this.records[listName] = [];
        }

        if (msg.type === "status_create" && msg.transportAccountingDTO?.length) {
            const dto = msg.transportAccountingDTO[0] as TransportAccounting;

            // Проверяем, есть ли уже запись с таким ID
            const existingIndex = this.records[listName].findIndex(r => r.id === dto.id);
            if (existingIndex >= 0) {
              console.log(`[socket] запись с id=${dto.id} уже существует, пропускаем`);
              return;
            }

            // Просто добавляем новую запись - без поиска временных
            this.records[listName].push(dto);
            console.log(`[socket] добавлена новая запись id=${dto.id}`);
        } else if (msg.type === "status_update" && msg.transportAccountingDTO?.length) {
            const dto = msg.transportAccountingDTO[0] as TransportAccounting;

            const existingIndex = this.records[listName].findIndex(r => r.id === dto.id);
            if (existingIndex >= 0) {
              this.records[listName][existingIndex] = dto;
              console.log(`[socket] обновлена запись id=${dto.id}`);
            }
        } else if (msg.type === "status_delete" && msg.transportAccountingDTO?.length) {
            const dto = msg.transportAccountingDTO[0] as TransportAccounting;

            const index = this.records[listName].findIndex(r => r.id === dto.id);
            if (index >= 0) {
              this.records[listName].splice(index, 1);
              console.log(`[socket] удалена запись id=${dto.id}`);
            }
        }
    },
    //     }
    //   }
    // },
    applyLocalChange(dto: TransportAccountingSR) {
      const listName = dto.listName || "";
      const originalId = dto.id;

      if (!this.records[listName]) {
        this.records[listName] = [];
      }

      // Применяем изменения только для существующих записей с реальными ID
      if (originalId && originalId > 0) {
        const idx = this.records[listName].findIndex(r => r.id === originalId);

        if (idx !== -1) {
            this.records[listName][idx] = { ...dto } as unknown as TransportAccounting;
            console.log(`[local] обновлена существующая запись id=${originalId}`);
        } else {
            console.log(`[local] запись с id=${originalId} не найдена для локального обновления`);
        }
      } else {
        // Для новых записей НЕ создаем локальные копии, ждем socket-ответа
        console.log(`[local] пропускаем создание локальной копии для новой записи (id=${originalId}), ждем socket`);
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
    async fetchCompaniesNameList() {
      this.loading = true;
      this.error = "";
      try {
        const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
        const data = await $fetch('/api/company/namelist', { headers });
        // @ts-ignore
        const names = data.object as string[]; 
        this.companies = names;
      } catch (e: any) {
        this.error = e?.data?.statusMessage || e?.message || "Ошибка загрузки";
        throw e;
      } finally {
        this.loading = false;
      }
    }
  },
});
