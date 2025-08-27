
import logger from '../utils/logger.js';
import { checkUserPhone } from '../services/database.service.js';

export async function getUseremail(phone,state) {
    try {
        const user = await checkUserPhone(phone);
        if (user) {

            return {
                ...state,
                userId: user.id,
                userPhone: phone,
                userName: user.nombre,
                userEmail: user.email,
                userLocal: user.nombre_local,
                localId: user.local_id,
                fractal_code: user.fractal_code,
                lastResponse: null,
                userNew: false
            };
        }
        return state;
    } catch (error) {
        logger.error('Error verificacionPhoneNode :', error);
        return {
            ...state,
            lastResponse: '',
            step: end,
            userNew: true
        };
    }
}