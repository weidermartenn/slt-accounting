import type { Employee } from "../Employee/types";

export interface UserDto {
    chatId: number;
    confirmed: boolean;
    confirmedNotification: boolean;
    employee: Employee;
    fullName: string;
    id: number;
    login: string;
    name: string;
    phone: string;
    role: string;
}