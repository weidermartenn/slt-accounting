// DTO одной записи — все поля строки, id: number, listName: string
export interface TransportAccountingUpdateDto {
  additionalExpenses: string
  addressOfDelivery: string
  cargo: string
  client: string
  clientLead: string
  contractor: string
  contractorRate: string
  dateOfBill: string
  dateOfPaymentContractor: string
  dateOfPickup: string
  dateOfSubmission: string
  datePayment: string
  departmentHead: string
  driver: string
  formPayAs: string
  formPayHim: string
  id: number                   // обязателен > 0 для PATCH
  listName: string             // обязателен
  manager: string
  numberOfBill: string
  numberOfBillAdd: string
  numberOfContainer: string
  ourFirm: string
  salesManager: string
  sumIssued: string
  summa: string
  typeOfContainer: string
}

// Тело запроса PATCH строго по Swagger
export interface TransportAccountingUpdateRequest {
  transportAccountingSaveRequestDtos: TransportAccountingUpdateDto[]
}