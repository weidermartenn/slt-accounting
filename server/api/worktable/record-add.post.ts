import type { TransportAccountingSR } from '~/entities/TransportAccountingSaveRequestDto/types'
import type { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
    const { public: { sltApiBase } } = useRuntimeConfig()

    if (!sltApiBase) {
        throw createError({ statusCode: 500, statusMessage: 'sltApiBase не указан' })
    }

    type Body = { data: TransportAccountingSR }
    const body = await readBody<Body>(event)

    if (!body?.data) {
        throw createError({ statusCode: 400, statusMessage: 'Данные не указаны' })
    }

    const S = (v: unknown) => 
    (v == null ? '' : String(v).replace(/\r?\n/g, '').trim())

    const d = body.data
    const dto = {
        additionalExpenses: S(d.additionalExpenses),
        addressOfDelivery: S(d.addressOfDelivery),
        cargo: S(d.cargo),
        client: S(d.client),
        clientLead: S(d.clientLead),
        contractor: S(d.contractor),
        contractorRate: S(d.contractorRate),
        dateOfBill: S(d.dateOfBill),
        dateOfPaymentContractor: S(d.dateOfPaymentContractor),
        dateOfPickup: S(d.dateOfPickup),
        dateOfSubmission: S(d.dateOfSubmission),
        datePayment: S(d.datePayment),
        departmentHead: S(d.departmentHead),
        driver: S(d.driver),
        formPayAs: S(d.formPayAs),
        formPayHim: S(d.formPayHim),
        id: 0,
        income: S(d.income),
        incomeLearned: S(d.incomeLearned),
        manager: S(d.manager),
        numberOfBill: S(d.numberOfBill),
        numberOfBillAdd: S(d.numberOfBillAdd),
        numberOfContainer: S(d.numberOfContainer),
        ourFirm: S(d.ourFirm),
        salesManager: S(d.salesManager),
        sumIssued: S(d.sumIssued),
        summa: S(d.summa),
    }

    const payload = {
        transportAccountingSR: [dto]
    }

    try {
        return await $fetch(`${sltApiBase}/workTable/transportAccounting`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getCookie(event, 'access_token')}` },
            body: payload
        })
    } catch (e: any) {
        throw createError({
            statusCode: e?.status || 500,
            statusMessage: e?.data?.message || 'Произошла ошибка',
            data: e?.data
        })
    }
})