import axios from 'axios'

export const API = (token) => {
    return axios.create({
        // baseURL: 'http://localhost:8080/api',
        baseURL: 'https://kings-logix.ru/api',
        // baseURL: 'http://31.25.237.80/api',
        responseType: 'json',
        headers: {
            'X-Custom-Header': 'foobar',
            Authorization: `Bearer ${token}`,
        },
    })
}
