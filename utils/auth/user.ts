import { API } from "./api";
const prefix = '/user'

const postUserLoginCode = (p: string) => {
    return API(localStorage.getItem('userToken') || '').post(`${prefix}/loginByCode`, 
        { login: p }
    )
}

const postUserConfirmCode = (p: string, token: string) => {
    return API(localStorage.getItem('userToken') || '').post(`${prefix}/loginByCodeConfirmation`, 
        { 
            login: p,
            confirmToken: token
        }
    )
}

export {
    postUserLoginCode,
    postUserConfirmCode
}