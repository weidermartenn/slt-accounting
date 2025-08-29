import z from "zod";

export const saveSchema = z.object({
    id: z.coerce.number().min(0).default(0),
  dateOfPickup: z.string().min(1),
  numberOfContainer: z.string().min(1),
  cargo: z.string().min(1),
  typeOfContainer: z.string().min(1),
  dateOfSubmission: z.string().optional().default(''),
  addressOfDelivery: z.string().optional().default(''),
  ourFirm: z.string().optional().default(''),
  client: z.string().optional().default(''),
  formPayAs: z.string().optional().default(''),
  summa: z.string().optional().default(''),
  numberOfBill: z.string().optional().default(''),
  dateOfBill: z.string().optional().default(''),
  datePayment: z.string().optional().default(''),
  contractor: z.string().optional().default(''),
  driver: z.string().optional().default(''),
  formPayHim: z.string().optional().default(''),
  contractorRate: z.string().optional().default(''),
  sumIssued: z.string().optional().default(''),
  numberOfBillAdd: z.string().optional().default(''),
  dateOfPaymentContractor: z.string().optional().default(''),
  manager: z.string().optional().default(''),
  clientLead: z.string().optional().default(''),
  departmentHead: z.string().optional().default(''),
  salesManager: z.string().optional().default(''),
  additionalExpenses: z.coerce.number().min(0).default(0),
  income: z.coerce.number().min(0).default(0),
  incomeLearned: z.coerce.number().min(0).default(0),
  taxes: z.coerce.number().min(0).default(0)
})

export type SavePayload = z.infer<typeof saveSchema>