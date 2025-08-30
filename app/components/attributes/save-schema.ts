import z from "zod";

// Вспомогательная функция для строковых полей
const stringField = (required: boolean = false, message: string = 'Обязательное поле') => {
  const field = z.coerce.string();
  return required ? field.min(1, message) : field.optional().default('');
};

export const saveSchema = z.object({
  dateOfPickup: stringField(true, "Укажите дату"),
  numberOfContainer: stringField(true, "Обязательное поле"),
  cargo: stringField(true, "Обязательное поле"),
  typeOfContainer: stringField(true, "Обязательное поле"),
  dateOfSubmission: stringField(),
  addressOfDelivery: stringField(),
  ourFirm: stringField(),
  client: stringField(),
  formPayAs: stringField(),
  summa: stringField(),
  numberOfBill: stringField(),
  dateOfBill: stringField(),
  datePayment: stringField(),
  contractor: stringField(),
  driver: stringField(),
  formPayHim: stringField(),
  contractorRate: stringField(),
  sumIssued: stringField(),
  numberOfBillAdd: stringField(),
  dateOfPaymentContractor: stringField(),
  manager: stringField(),
  clientLead: stringField(),
  departmentHead: stringField(),
  salesManager: stringField(),
  additionalExpenses: stringField(),
  income: stringField(),
  incomeLearned: stringField(),
  taxes: stringField()
});

export type SavePayload = z.infer<typeof saveSchema>;