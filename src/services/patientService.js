import { raw } from "body-parser"
import db from "../models/index"
require('dotenv').config()
import emailService from './emailService'
import { v4 as uuidv4 } from 'uuid';
let buildUrlEmail = (doctorId, token) => {
    let result = `${process.env.URL_REACT}/verify-booking?token=${token}&doctorId=${doctorId}`
    return result
}

let postAppointment = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.email || !data.doctorId || !data.timeType || !data.date || !data.fullName
                || !data.selectedGender || !data.address) {
                resolve({
                    errCode: -1,
                    errMessage: "missing lot of shit"
                })
            } else {
                let token = uuidv4()
                await emailService.sendAEmail({
                    receiverEmail: data.email,
                    patientName: data.fullName,
                    time: data.timeString,
                    doctorName: data.doctorName,
                    language: data.language,
                    link: buildUrlEmail(data.doctorId, token),
                })
                //upsert patient
                let user = await db.User.findOrCreate({
                    where: { email: data.email },
                    defaults: {
                        email: data.email,
                        roleId: 'R3',
                        gender: data.selectedGender,
                        address: data.address,
                        firstName: data.fullName,
                    }
                })
                //create a booking record
                if (user && user[0]) {
                    await db.bookings.findOrCreate({
                        where: { patientId: user[0].id },
                        defaults: {
                            statusId: 'S1',
                            doctorId: data.doctorId,
                            patientId: user[0].id,
                            date: data.date,
                            timeType: data.timeType,
                            token: token
                        },
                    })
                }
                resolve({
                    errCode: 0,
                    errMessage: "Đặt chỗ Đ* ngon r"
                })
            }
        } catch (error) {
            reject(error)
        }
    })
}
let postVerifyAppointment = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.token || !data.doctorId) {
                resolve({
                    errCode: -1,
                    errMessage: "missing lot of shit"
                })
            } else {
                let appointment = await db.bookings.findOne({
                    where: { doctorId: data.doctorId, token: data.token, statusId: 'S1' },
                    raw: false
                })
                if (appointment) {
                    appointment.statusId = 'S2'
                    await appointment.save()
                    resolve({
                        errCode: 0,
                        errMessage: 'Update appointment success'
                    })
                }
                else {
                    resolve({
                        errCode: -2,
                        errMessage: 'Lịch hẹn đã có hoặc ko tồn tại'
                    })
                }
            }
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
    postAppointment, postVerifyAppointment
}